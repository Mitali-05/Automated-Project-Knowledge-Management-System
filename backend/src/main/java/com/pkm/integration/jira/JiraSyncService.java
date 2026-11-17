package com.pkm.integration.jira;

import com.fasterxml.jackson.databind.JsonNode;
import com.pkm.common.ApiException;
import com.pkm.project.ProjectAccess;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.beans.factory.DisposableBean;
import java.util.*;
import java.util.concurrent.*;

/** A complete visible snapshot replaces the previous one only after every page succeeds. */
@Service
public class JiraSyncService implements DisposableBean {
    private final JdbcTemplate db;
    private final JiraIntegrationService integration;
    private final JiraClient jira;
    private final ProjectAccess access;
    private final TransactionTemplate tx;
    private final ExecutorService executor = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(10), Thread.ofPlatform().daemon(true).name("jira-sync-", 0).factory());
    public JiraSyncService(JdbcTemplate db, JiraIntegrationService integration, JiraClient jira,
                           ProjectAccess access, PlatformTransactionManager transactions) {
        this.db=db; this.integration=integration; this.jira=jira; this.access=access;
        tx=new TransactionTemplate(transactions);
    }
    public Map<String,Object> state(long user, long project) {
        access.requireMember(project,user);
        var rows=db.queryForList("SELECT sync_status,synced_at,sync_error FROM jira_connections WHERE project_id=?",project);
        var result=new HashMap<String,Object>();
        result.put("connection",rows.isEmpty()?null:rows.getFirst());
        result.put("issues",db.queryForList("SELECT issue_key,summary,status,issue_type,priority,description,acceptance_criteria,comments,source_url,source_updated_at FROM jira_issues WHERE project_id=? ORDER BY issue_key",project));
        result.put("reports",db.queryForList("SELECT j.status,j.error,r.repo_name FROM jira_report_jobs j JOIN project_repositories r ON r.id=j.repository_id WHERE r.project_id=?",project));
        return result;
    }
    public void start(long user,long project) {
        integration.requireManager(user,project); integration.requireGrantOwner(user,project);
        UUID run=UUID.randomUUID();
        if(db.update("UPDATE jira_connections SET sync_status='RUNNING',sync_started_at=now(),sync_error=NULL,sync_run_id=? WHERE project_id=? AND jira_project_id IS NOT NULL AND (sync_status<>'RUNNING' OR sync_started_at<now()-interval '15 minutes')",run,project)!=1)
            throw ApiException.conflict("Select a Jira project first, or wait for the active synchronization");
        try { executor.execute(()->sync(project,run)); }
        catch(RejectedExecutionException e) { fail(project,run,"Jira sync queue is full. Try again later."); throw ApiException.conflict("Jira sync queue is full"); }
    }
    private void fail(long project,UUID run,String error) {
        db.update("UPDATE jira_connections SET sync_status='FAILED',sync_error=? WHERE project_id=? AND sync_run_id=?",error,project,run);
    }
    private void sync(long project,UUID run) {
        try {
            var c=db.queryForMap("SELECT cloud_id,jira_project_id,site_url FROM jira_connections WHERE project_id=? AND sync_run_id=?",project,run);
            String cloud=(String)c.get("cloud_id"), jiraProject=(String)c.get("jira_project_id");
            List<String> fields=new ArrayList<>(List.of("summary","description","status","issuetype","priority","updated","security","project"));
            JsonNode definitions=jira.fields(cloud,integration.token(project));
            if(!definitions.isArray()) throw ApiException.conflict("Jira returned invalid field definitions");
            List<String> acceptance=new ArrayList<>();
            for(var f:definitions) if(f.path("name").asText().equalsIgnoreCase("Acceptance Criteria")) { acceptance.add(f.path("id").asText()); fields.add(f.path("id").asText()); }
            List<Issue> issues=new ArrayList<>(); Set<String> seen=new HashSet<>(), cursors=new HashSet<>(); String cursor=null;
            boolean finished=false;
            for(int page=0;page<100;page++) {
                JsonNode response=jira.issues(cloud,jiraProject,cursor,fields,integration.token(project));
                if(!response.path("issues").isArray() || !response.path("isLast").isBoolean()) throw ApiException.conflict("Jira returned invalid issue pagination");
                for(var raw:response.path("issues")) {
                    var f=raw.path("fields");
                    if(!f.path("project").path("id").asText().equals(jiraProject)) throw ApiException.conflict("Jira returned an issue from another project");
                    if(!f.has("security")) throw ApiException.conflict("Jira did not return issue security metadata; snapshot not shared");
                    if(!f.path("security").isNull()) continue;
                    String id=raw.path("id").asText(), key=raw.path("key").asText();
                    if(!id.matches("[0-9]+") || !key.matches("[A-Z][A-Z0-9_]*-[0-9]+") || !seen.add(id)) throw ApiException.conflict("Jira returned an invalid or duplicate issue");
                    StringBuilder criteria=new StringBuilder(); for(String field:acceptance) criteria.append(text(f.path(field))).append('\n');
                    issues.add(new Issue(id,key,f.path("summary").asText(),f.path("status").path("name").asText(),
                        f.path("issuetype").path("name").asText(),f.path("priority").path("name").asText(),text(f.path("description")),criteria.toString().strip(),
                        comments(cloud,id,project),c.get("site_url")+"/browse/"+key,f.path("updated").asText()));
                }
                if(response.path("isLast").asBoolean()) { finished=true; break; }
                cursor=response.path("nextPageToken").asText();
                if(cursor.isBlank() || !cursors.add(cursor)) throw ApiException.conflict("Jira issue pagination did not advance");
            }
            if(!finished) throw ApiException.conflict("Jira snapshot exceeds the 10,000 issue safety limit; previous snapshot preserved");
            tx.executeWithoutResult(s->{
                if(db.queryForList("SELECT project_id FROM jira_connections WHERE project_id=? AND sync_run_id=? FOR UPDATE",project,run).isEmpty()) return;
                // Delete only Jira-derived knowledge. GitHub knowledge and users are untouched.
                db.update("DELETE FROM knowledge_items WHERE project_id=? AND external_id LIKE 'jira:%'",project);
                db.update("DELETE FROM jira_issues WHERE project_id=?",project);
                for(Issue i:issues) {
                    db.update("INSERT INTO jira_issues VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",project,i.id,i.key,i.summary,i.status,i.type,i.priority,i.description,i.criteria,i.comments,i.url,i.updated);
                    String details="Jira requirement/discussion, not proof of implemented code.\nStatus: "+i.status+"\nPriority: "+i.priority+"\nUpdated: "+i.updated+"\nDescription:\n"+i.description+"\nAcceptance criteria:\n"+i.criteria+"\nComments:\n"+i.comments;
                    Long knowledge=db.queryForObject("INSERT INTO knowledge_items(project_id,external_id,title,knowledge_type,summary,details,module) VALUES(?,?,?,?,?,?,?) RETURNING id",Long.class,
                        project,"jira:"+i.id,shorten(i.key+": "+i.summary,512),"Jira Requirement",shorten(i.summary,8000),details,"Jira / "+i.key);
                    db.update("INSERT INTO knowledge_evidence(knowledge_item_id,source_type,source_ref,url,excerpt) VALUES(?,?,?,?,?)",knowledge,"JIRA",i.key,i.url,shorten(i.description,4000));
                }
                db.update("UPDATE jira_connections SET sync_status='SYNCED',synced_at=now(),sync_error=NULL WHERE project_id=?",project);
                queueReports(db,project);
            });
        } catch(Exception e) { fail(project,run,e instanceof ApiException?e.getMessage():"Jira synchronization failed ("+e.getClass().getSimpleName()+"). Previous snapshot preserved."); }
    }
    private String comments(String cloud,String id,long project) {
        StringBuilder value=new StringBuilder();
        for(int start=0,pages=0;pages<100;pages++) {
            var page=jira.comments(cloud,id,start,integration.token(project));
            if(!page.path("comments").isArray() || !page.path("total").canConvertToInt()) throw ApiException.conflict("Invalid Jira comment pagination");
            var comments=page.path("comments");
            for(var comment:comments) if(comment.path("visibility").isNull() || comment.path("visibility").isMissingNode())
                value.append(comment.path("author").path("displayName").asText()).append(": ").append(text(comment.path("body"))).append('\n');
            start+=comments.size();
            if(start>=page.path("total").asInt()) return value.toString();
            if(comments.isEmpty()) throw ApiException.conflict("Jira comment pagination did not advance");
        }
        throw ApiException.conflict("Jira comments exceed the supported snapshot limit");
    }
    static String text(JsonNode node) {
        if(node.isNull() || node.isMissingNode()) return "";
        if(node.isTextual() || node.isNumber() || node.isBoolean()) return node.asText();
        StringBuilder b=new StringBuilder();
        if(node.isArray()) { for(var child:node)b.append(text(child)); }
        else {
            if(node.has("text"))b.append(node.path("text").asText());
            if(node.path("type").asText().equals("hardBreak"))b.append('\n');
            if(node.path("type").asText().equals("mention"))b.append(node.path("attrs").path("text").asText());
            if(node.has("content"))b.append(text(node.path("content")));
            if(Set.of("paragraph","heading","listItem","tableRow").contains(node.path("type").asText()))b.append('\n');
        }
        return b.toString();
    }
    static String shorten(String value,int max) { return value.length()>max?value.substring(0,max):value; }
    static void queueReports(JdbcTemplate db,long project) {
        for(Long id:db.queryForList("SELECT repository_id FROM repository_reports WHERE project_id=?",Long.class,project))
            db.update("INSERT INTO jira_report_jobs(repository_id,id) VALUES(?,?) ON CONFLICT(repository_id) DO UPDATE SET id=excluded.id,status='PENDING',started_at=NULL,error=NULL",id,UUID.randomUUID());
    }
    record Issue(String id,String key,String summary,String status,String type,String priority,String description,String criteria,String comments,String url,String updated) {}
    public void destroy() { executor.shutdownNow(); }
}

package com.pkm.integration.jira;
import com.fasterxml.jackson.databind.JsonNode;
import com.pkm.common.ApiException;
import com.pkm.report.ReportService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@RestController
@RequestMapping("/api/ingest/jira")
public class JiraReportController {
    private final JdbcTemplate db;
    private final ReportService reports;
    public JiraReportController(JdbcTemplate db,ReportService reports) { this.db=db;this.reports=reports; }
    public record Completion(String id,String generatedAt,JsonNode report,String pdf,String pptx,String error) {}
    @GetMapping("/context/{project}")
    public List<Map<String,Object>> context(@PathVariable long project) {
        return db.queryForList("SELECT issue_key,summary,status,issue_type,priority,description,acceptance_criteria,comments,source_url,source_updated_at FROM jira_issues WHERE project_id=? ORDER BY issue_key",project);
    }
    @PostMapping("/reports/claim")
    @Transactional
    public List<Map<String,Object>> claim() {
        var rows=db.queryForList("SELECT j.id,j.repository_id,r.project_id,r.report,r.generated_at::text AS base_version,p.repo_owner,p.repo_name FROM jira_report_jobs j JOIN repository_reports r ON r.repository_id=j.repository_id JOIN project_repositories p ON p.id=j.repository_id WHERE j.status='PENDING' OR (j.status='RUNNING' AND j.started_at<now()-interval '15 minutes') ORDER BY j.repository_id LIMIT 1 FOR UPDATE OF j SKIP LOCKED");
        for(var row:rows) {
            db.update("UPDATE jira_report_jobs SET status='RUNNING',started_at=now() WHERE id=?",row.get("id"));
            row.put("issues",context(((Number)row.get("project_id")).longValue()));
        }
        return rows;
    }
    @PostMapping("/reports/complete")
    @Transactional
    public Map<String,Boolean> complete(@RequestBody Completion request) {
        UUID id; try { id=UUID.fromString(request.id()); } catch(Exception e){throw ApiException.badRequest("Invalid report job id");}
        var rows=db.queryForList("SELECT j.repository_id,r.generated_at::text AS base_version FROM jira_report_jobs j JOIN repository_reports r ON r.repository_id=j.repository_id WHERE j.id=? AND j.status='RUNNING' FOR UPDATE OF j,r",id);
        if(rows.isEmpty()) throw ApiException.conflict("Report refresh was superseded");
        if(request.error()!=null) {
            db.update("UPDATE jira_report_jobs SET status='FAILED',error=? WHERE id=?",JiraSyncService.shorten(request.error(),1000),id);
            return Map.of("saved",false);
        }
        if(!rows.getFirst().get("base_version").equals(request.generatedAt())) {
            db.update("UPDATE jira_report_jobs SET status='PENDING',id=?,started_at=NULL WHERE id=?",UUID.randomUUID(),id);
            return Map.of("saved",false);
        }
        long repository=((Number)rows.getFirst().get("repository_id")).longValue();
        byte[] pdf,deck;
        try { pdf=Base64.getDecoder().decode(request.pdf()); deck=Base64.getDecoder().decode(request.pptx()); }
        catch(Exception e){throw ApiException.badRequest("Invalid report file encoding");}
        reports.saveReport(repository,request.report());
        reports.saveFile(repository,"pdf",pdf); reports.saveFile(repository,"pptx",deck);
        db.update("UPDATE jira_report_jobs SET status='COMPLETED',error=NULL WHERE id=?",id);
        return Map.of("saved",true);
    }
}

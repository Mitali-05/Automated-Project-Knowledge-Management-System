package com.pkm.rag.service;

import com.pkm.project.Project;
import com.pkm.rag.dto.KnowledgeItem;
import com.pkm.rag.entity.KnowledgeItemEntity;
import com.pkm.rag.entity.KnowledgeItemRepository;
import com.pkm.rag.entity.ProjectRepositoryEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.List;
import java.util.Map;
import java.util.Base64;

@Service
public class GitHubExtractionService {
    
    private final AgenticRagService ragService;
    private final KnowledgeItemRepository knowledgeItemRepo;
    private final RestTemplate restTemplate;
    private final GitHubAppService githubAppService;

    public GitHubExtractionService(AgenticRagService ragService, KnowledgeItemRepository knowledgeItemRepo, GitHubAppService githubAppService) {
        this.ragService = ragService;
        this.knowledgeItemRepo = knowledgeItemRepo;
        this.githubAppService = githubAppService;
        this.restTemplate = new RestTemplate();
    }

    private <T> ResponseEntity<T> makeGetRequest(String url, Class<T> responseType, String installationId) {
        HttpHeaders headers = new HttpHeaders();
        if (installationId != null && !installationId.isBlank()) {
            String token = githubAppService.getInstallationAccessToken(installationId);
            if (token != null) {
                headers.setBearerAuth(token);
            }
        }
        headers.set("Accept", "application/vnd.github+json");
        headers.set("X-GitHub-Api-Version", "2022-11-28");
        HttpEntity<String> entity = new HttpEntity<>(headers);
        return restTemplate.exchange(url, HttpMethod.GET, entity, responseType);
    }
    
    public void extractAndSaveKnowledge(Project project, ProjectRepositoryEntity repoEntity) {
        String url = repoEntity.getUrl();
        // Parse URL like https://github.com/owner/repo
        String[] parts = url.replace("https://github.com/", "").split("/");
        if (parts.length < 2) return;
        
        String owner = parts[0];
        String repo = parts[1];
        
        StringBuilder evidence = new StringBuilder();
        
        String installationId = project.getOrganization() != null ? project.getOrganization().getGithubInstallationId() : null;
        
        // Fetch README
        try {
            String readmeUrl = "https://api.github.com/repos/" + owner + "/" + repo + "/readme";
            ResponseEntity<Map> response = makeGetRequest(readmeUrl, Map.class, installationId);
            if (response.getBody() != null && response.getBody().get("content") != null) {
                String base64Content = (String) response.getBody().get("content");
                base64Content = base64Content.replaceAll("\\s", "");
                String content = new String(Base64.getDecoder().decode(base64Content));
                
                // Truncate if readme is too large just to be safe for quick test
                if (content.length() > 10000) {
                    content = content.substring(0, 10000);
                }
                
                evidence.append("[SOURCE:README.md]\n").append(content).append("\n\n");
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch README for " + owner + "/" + repo);
            e.printStackTrace();
        }
        
        // Fetch 5 latest commits
        try {
            String commitsUrl = "https://api.github.com/repos/" + owner + "/" + repo + "/commits?per_page=5";
            ResponseEntity<List> response = makeGetRequest(commitsUrl, List.class, installationId);
            if (response.getBody() != null) {
                for (Object item : response.getBody()) {
                    Map commitObj = (Map) item;
                    String sha = (String) commitObj.get("sha");
                    Map commitData = (Map) commitObj.get("commit");
                    String message = (String) commitData.get("message");
                    
                    evidence.append("[COMMIT:").append(sha.substring(0, 8)).append("]\n");
                    evidence.append("Message: ").append(message).append("\n\n");
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch commits for " + owner + "/" + repo);
            e.printStackTrace();
        }
        
        System.out.println("Evidence length: " + evidence.length());
        
        // Feed to Agentic RAG
        List<KnowledgeItem> items = ragService.extractKnowledge(evidence.toString());
        
        // Save
        for (KnowledgeItem item : items) {
            KnowledgeItemEntity entity = new KnowledgeItemEntity();
            entity.setProject(project);
            entity.setRepository(repoEntity);
            entity.setTitle(item.title());
            entity.setKnowledgeType(item.knowledgeType());
            entity.setSummary(item.summary());
            entity.setDetails(item.details());
            entity.setModule(item.module());
            entity.setConfidence(item.confidence());
            
            if (item.evidenceIds() != null) {
                entity.setEvidenceIds(String.join(",", item.evidenceIds()));
            }
            
            knowledgeItemRepo.save(entity);
        }
    }
}

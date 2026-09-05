package com.pkm.rag.controller;

import com.pkm.rag.dto.KnowledgeResponse;
import com.pkm.rag.entity.KnowledgeItemEntity;
import com.pkm.rag.entity.KnowledgeItemRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects/{projectId}/knowledge")
public class KnowledgeController {

    private final KnowledgeItemRepository knowledgeItemRepository;

    public KnowledgeController(KnowledgeItemRepository knowledgeItemRepository) {
        this.knowledgeItemRepository = knowledgeItemRepository;
    }

    @GetMapping
    public ResponseEntity<List<KnowledgeResponse>> getKnowledgeItems(@PathVariable Long projectId) {
        List<KnowledgeItemEntity> items = knowledgeItemRepository.findByProjectId(projectId);

        List<KnowledgeResponse> response = items.stream().map(this::mapToResponse).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    private KnowledgeResponse mapToResponse(KnowledgeItemEntity entity) {
        List<KnowledgeResponse.Source> sources = new ArrayList<>();
        
        String repoUrl = entity.getRepository() != null ? entity.getRepository().getUrl() : null;
        
        if (entity.getEvidenceIds() != null && !entity.getEvidenceIds().isBlank()) {
            String[] evIds = entity.getEvidenceIds().split(",");
            for (int i = 0; i < evIds.length; i++) {
                String evidence = evIds[i].trim();
                String type = "File";
                String reference = evidence;
                String url = null;
                
                if (evidence.startsWith("[COMMIT:")) {
                    type = "Commit";
                    reference = evidence.replace("[COMMIT:", "").replace("]", "");
                    if (repoUrl != null) {
                        url = repoUrl + "/commit/" + reference;
                    }
                } else if (evidence.startsWith("[SOURCE:")) {
                    type = "Source";
                    reference = evidence.replace("[SOURCE:", "").replace("]", "");
                    if (repoUrl != null) {
                        url = repoUrl + "/blob/main/" + reference;
                    }
                }

                sources.add(new KnowledgeResponse.Source(
                        String.valueOf(i),
                        type,
                        reference,
                        url
                ));
            }
        }

        return new KnowledgeResponse(
                String.valueOf(entity.getId()),
                String.valueOf(entity.getProject().getId()),
                entity.getTitle() != null ? entity.getTitle() : "Untitled",
                entity.getSummary() != null ? entity.getSummary() : "",
                entity.getKnowledgeType() != null ? entity.getKnowledgeType() : "Unknown",
                "Fresh",
                entity.getModule() != null ? entity.getModule() : "Core",
                entity.getConfidence() != null ? String.format("%.0f%%", entity.getConfidence() * 100) : "80%",
                sources,
                entity.getCreatedAt().toString()
        );
    }
}

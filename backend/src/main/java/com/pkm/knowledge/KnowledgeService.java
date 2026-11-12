package com.pkm.knowledge;

import com.pkm.common.ApiException;
import com.pkm.project.ProjectAccess;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class KnowledgeService {

    private final KnowledgeItemRepository repository;
    private final ProjectAccess access;

    public KnowledgeService(KnowledgeItemRepository repository, ProjectAccess access) {
        this.repository = repository;
        this.access = access;
    }

    public List<KnowledgeDto> list(Long projectId, Long userId) {
        access.requireMember(projectId, userId);
        return repository.findAllWithEvidence(projectId).stream().map(KnowledgeDto::from).toList();
    }

    public KnowledgeDto get(Long projectId, Long itemId, Long userId) {
        access.requireMember(projectId, userId);
        return repository.findOneWithEvidence(itemId, projectId).map(KnowledgeDto::from)
                .orElseThrow(() -> ApiException.notFound("Knowledge item not found"));
    }
}

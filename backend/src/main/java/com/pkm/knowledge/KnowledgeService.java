package com.pkm.knowledge;

import com.pkm.common.ApiException;
import com.pkm.freshness.KnowledgeFreshness;
import com.pkm.freshness.KnowledgeFreshnessRepository;
import com.pkm.project.ProjectAccess;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class KnowledgeService {

    private final KnowledgeItemRepository repository;
    private final KnowledgeFreshnessRepository freshnessRepository;
    private final ProjectAccess access;

    public KnowledgeService(
            KnowledgeItemRepository repository,
            KnowledgeFreshnessRepository freshnessRepository,
            ProjectAccess access) {
        this.repository = repository;
        this.freshnessRepository = freshnessRepository;
        this.access = access;
    }

    public List<KnowledgeDto> list(Long projectId, Long userId) {
        access.requireMember(projectId, userId);
        Map<Long, String> statusMap = freshnessRepository.findByProjectId(projectId).stream()
                .collect(Collectors.toMap(f -> f.getKnowledgeItem().getId(), KnowledgeFreshness::getChangeStatus, (a, b) -> a));
        return repository.findAllWithEvidence(projectId).stream()
                .map(k -> KnowledgeDto.from(k, statusMap.getOrDefault(k.getId(), "UNKNOWN")))
                .toList();
    }

    public KnowledgeDto get(Long projectId, Long itemId, Long userId) {
        access.requireMember(projectId, userId);
        String changeStatus = freshnessRepository.findByKnowledgeItemId(itemId)
                .map(KnowledgeFreshness::getChangeStatus)
                .orElse("UNKNOWN");
        return repository.findOneWithEvidence(itemId, projectId)
                .map(k -> KnowledgeDto.from(k, changeStatus))
                .orElseThrow(() -> ApiException.notFound("Knowledge item not found"));
    }
}

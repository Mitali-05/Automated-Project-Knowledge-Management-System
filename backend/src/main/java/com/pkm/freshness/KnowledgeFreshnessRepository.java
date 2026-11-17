package com.pkm.freshness;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface KnowledgeFreshnessRepository extends JpaRepository<KnowledgeFreshness, Long> {

    Optional<KnowledgeFreshness> findByKnowledgeItemId(Long knowledgeItemId);

    List<KnowledgeFreshness> findByProjectId(Long projectId);

    @Query("select f from KnowledgeFreshness f join fetch f.knowledgeItem where f.project.id = :projectId and f.changeStatus in ('POTENTIALLY_STALE', 'OUTDATED')")
    List<KnowledgeFreshness> findAffectedByProjectId(Long projectId);

    long countByProjectIdAndChangeStatus(Long projectId, String changeStatus);
}

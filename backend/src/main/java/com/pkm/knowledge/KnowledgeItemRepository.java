package com.pkm.knowledge;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface KnowledgeItemRepository extends JpaRepository<KnowledgeItem, Long> {

    @Query("select distinct k from KnowledgeItem k left join fetch k.evidence where k.project.id = :projectId order by k.updatedAt desc")
    List<KnowledgeItem> findAllWithEvidence(Long projectId);

    @Query("select k from KnowledgeItem k left join fetch k.evidence where k.id = :id and k.project.id = :projectId")
    Optional<KnowledgeItem> findOneWithEvidence(Long id, Long projectId);

    Optional<KnowledgeItem> findByProjectIdAndExternalId(Long projectId, String externalId);

    long countByProjectId(Long projectId);

    void deleteByProjectId(Long projectId);

    @Query("select k from KnowledgeItem k join fetch k.project where k.project.id in :projectIds order by k.updatedAt desc")
    List<KnowledgeItem> findRecentForProjects(Collection<Long> projectIds, Pageable pageable);

    /** Rows of [projectId, count] for items updated at or after {@code since}. */
    @Query("select k.project.id, count(k) from KnowledgeItem k where k.project.id in :projectIds "
            + "and k.updatedAt >= :since group by k.project.id")
    List<Object[]> countByProjectSince(Collection<Long> projectIds, Instant since);

    /** Rows of [knowledgeType, count]. */
    @Query("select k.knowledgeType, count(k) from KnowledgeItem k where k.project.id in :projectIds group by k.knowledgeType")
    List<Object[]> countByType(Collection<Long> projectIds);
}

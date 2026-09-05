package com.pkm.rag.entity;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface KnowledgeItemRepository extends JpaRepository<KnowledgeItemEntity, Long> {
    List<KnowledgeItemEntity> findByProjectId(Long projectId);

    long countByProjectOrganizationId(Long orgId);

    @Query("SELECT k.knowledgeType, k.createdAt FROM KnowledgeItemEntity k WHERE k.project.organization.id = :orgId")
    List<Object[]> getKnowledgeDataForOrg(@Param("orgId") Long orgId);
}

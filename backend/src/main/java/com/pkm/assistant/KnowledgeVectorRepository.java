package com.pkm.assistant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KnowledgeVectorRepository extends JpaRepository<KnowledgeVector, Long> {

    List<KnowledgeVector> findByProjectId(Long projectId);

    Optional<KnowledgeVector> findByKnowledgeItemId(Long knowledgeItemId);

    void deleteByKnowledgeItemId(Long knowledgeItemId);
}

package com.pkm.freshness;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnowledgeChangeLinkRepository extends JpaRepository<KnowledgeChangeLink, Long> {

    List<KnowledgeChangeLink> findByKnowledgeItemId(Long knowledgeItemId);

    List<KnowledgeChangeLink> findByRepositoryChangeId(Long repositoryChangeId);

    void deleteByKnowledgeItemId(Long knowledgeItemId);
}

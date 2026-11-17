package com.pkm.freshness;

import com.pkm.knowledge.KnowledgeEvidence;
import com.pkm.knowledge.KnowledgeItem;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "knowledge_change_links")
@Getter
@Setter
@NoArgsConstructor
public class KnowledgeChangeLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "knowledge_item_id", nullable = false)
    private KnowledgeItem knowledgeItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "repository_change_id", nullable = false)
    private RepositoryChange repositoryChange;

    @Column(name = "matched_file", nullable = false, length = 1024)
    private String matchedFile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matched_evidence_id")
    private KnowledgeEvidence matchedEvidence;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

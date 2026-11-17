package com.pkm.assistant;

import com.pkm.knowledge.KnowledgeItem;
import com.pkm.project.Project;
import com.pkm.project.ProjectRepositoryLink;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "knowledge_vectors")
@Getter
@Setter
@NoArgsConstructor
public class KnowledgeVector {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "knowledge_item_id", nullable = false)
    private KnowledgeItem knowledgeItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id")
    private ProjectRepositoryLink repository;

    @Column(name = "embedding_text", nullable = false, columnDefinition = "TEXT")
    private String embeddingText;

    private Integer dimensions = 768;

    @Column(name = "embedding_json", columnDefinition = "TEXT")
    private String embeddingJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

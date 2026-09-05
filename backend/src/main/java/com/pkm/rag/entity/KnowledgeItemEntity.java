package com.pkm.rag.entity;

import com.pkm.project.Project;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "knowledge_items")
@Data
public class KnowledgeItemEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id")
    private ProjectRepositoryEntity repository;

    @Column(nullable = false, length = 512)
    private String title;

    @Column(name = "knowledge_type", nullable = false, length = 100)
    private String knowledgeType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String details;

    private String module;

    private Double confidence;

    @Column(name = "evidence_ids", columnDefinition = "TEXT")
    private String evidenceIds;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}

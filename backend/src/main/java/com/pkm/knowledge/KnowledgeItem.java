package com.pkm.knowledge;

import com.pkm.project.Project;
import com.pkm.project.ProjectRepositoryLink;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "knowledge_items")
@Getter
@Setter
@NoArgsConstructor
public class KnowledgeItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id")
    private ProjectRepositoryLink repository;

    /** Id assigned by the extraction service so re-sending the same item updates it instead of duplicating it. */
    @Column(name = "external_id", length = 128)
    private String externalId;

    @Column(nullable = false, length = 512)
    private String title;

    @Column(name = "knowledge_type", nullable = false, length = 50)
    private String knowledgeType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String details;

    private String module;

    private Double confidence;

    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<KnowledgeEvidence> evidence = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}

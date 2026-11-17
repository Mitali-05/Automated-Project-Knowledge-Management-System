package com.pkm.freshness;

import com.pkm.knowledge.KnowledgeItem;
import com.pkm.project.Project;
import com.pkm.project.ProjectRepositoryLink;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "knowledge_freshness")
@Getter
@Setter
@NoArgsConstructor
public class KnowledgeFreshness {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "knowledge_item_id", nullable = false, unique = true)
    private KnowledgeItem knowledgeItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id")
    private ProjectRepositoryLink repository;

    @Column(name = "change_status", nullable = false, length = 30)
    private String changeStatus = "CURRENT";

    @Column(name = "age_status", nullable = false, length = 20)
    private String ageStatus = "FRESH";

    @Column(name = "last_verified_commit", length = 64)
    private String lastVerifiedCommit;

    @Column(name = "affected_commit", length = 64)
    private String affectedCommit;

    @Column(name = "changed_files", columnDefinition = "TEXT")
    private String changedFiles;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "detected_at", nullable = false)
    private Instant detectedAt = Instant.now();

    @Column(name = "last_verified_at", nullable = false)
    private Instant lastVerifiedAt = Instant.now();

    @Column(name = "revalidation_status", nullable = false, length = 30)
    private String revalidationStatus = "NONE";
}

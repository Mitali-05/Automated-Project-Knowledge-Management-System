package com.pkm.freshness;

import com.pkm.project.Project;
import com.pkm.project.ProjectRepositoryLink;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "repository_snapshots")
@Getter
@Setter
@NoArgsConstructor
public class RepositorySnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "repository_id", nullable = false)
    private ProjectRepositoryLink repository;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 255)
    private String branch = "main";

    @Column(name = "commit_sha", nullable = false, length = 64)
    private String commitSha;

    @Column(name = "sync_status", nullable = false, length = 20)
    private String syncStatus = "SYNCED";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

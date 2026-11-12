package com.pkm.project;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** A GitHub repository linked to a project. Only a pointer plus sync state - never the repository content. */
@Entity
@Table(name = "project_repositories")
@Getter
@Setter
@NoArgsConstructor
public class ProjectRepositoryLink {

    public enum SyncStatus { PENDING, SYNCING, SYNCED, FAILED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false)
    private String provider = "GITHUB";

    @Column(nullable = false, length = 500)
    private String url;

    @Column(name = "repo_owner", nullable = false)
    private String repoOwner;

    @Column(name = "repo_name", nullable = false)
    private String repoName;

    @Enumerated(EnumType.STRING)
    @Column(name = "sync_status", nullable = false)
    private SyncStatus syncStatus = SyncStatus.PENDING;

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "last_sync_message", length = 500)
    private String lastSyncMessage;

    @Column(name = "added_at", nullable = false, updatable = false)
    private Instant addedAt = Instant.now();
}

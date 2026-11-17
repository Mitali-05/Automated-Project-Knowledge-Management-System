package com.pkm.freshness;

import com.pkm.project.Project;
import com.pkm.project.ProjectRepositoryLink;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "repository_changes")
@Getter
@Setter
@NoArgsConstructor
public class RepositoryChange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "repository_id", nullable = false)
    private ProjectRepositoryLink repository;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "from_commit", length = 64)
    private String fromCommit;

    @Column(name = "to_commit", nullable = false, length = 64)
    private String toCommit;

    @Column(name = "file_path", nullable = false, length = 1024)
    private String filePath;

    @Column(name = "change_type", nullable = false, length = 20)
    private String changeType = "MODIFIED";

    @Column(name = "commit_message", columnDefinition = "TEXT")
    private String commitMessage;

    @Column(length = 255)
    private String author;

    @Column(name = "detected_at", nullable = false)
    private Instant detectedAt = Instant.now();
}

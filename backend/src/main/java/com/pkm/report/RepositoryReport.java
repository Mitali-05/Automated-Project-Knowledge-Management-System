package com.pkm.report;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** The latest full extraction report of one repository, stored as the JSON the extractor produced. */
@Entity
@Table(name = "repository_reports")
@Getter
@Setter
@NoArgsConstructor
public class RepositoryReport {

    @Id
    @Column(name = "repository_id")
    private Long repositoryId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String report;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt = Instant.now();
}

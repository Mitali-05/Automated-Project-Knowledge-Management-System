package com.pkm.project;

import com.pkm.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "extraction_jobs")
@Getter
@Setter
@NoArgsConstructor
public class ExtractionJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id")
    private ProjectRepositoryLink repository;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(nullable = false)
    private int progress = 0;

    @Column(name = "status_message", length = 500)
    private String statusMessage;

    @Column(columnDefinition = "TEXT")
    private String logs;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "triggered_by")
    private User triggeredBy;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "trust_score")
    private Double trustScore;

    @Column(name = "items_extracted")
    private Integer itemsExtracted = 0;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
}

package com.pkm.activity;

import com.pkm.project.Project;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "project_activity")
@Getter
@Setter
@NoArgsConstructor
public class ProjectActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "event_type", nullable = false, length = 40)
    private String eventType;

    @Column(nullable = false, length = 512)
    private String title;

    @Column(name = "actor_name")
    private String actorName;

    @Column(name = "repository_url", length = 500)
    private String repositoryUrl;

    @Column(name = "source_ref")
    private String sourceRef;

    @Column(length = 1024)
    private String url;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

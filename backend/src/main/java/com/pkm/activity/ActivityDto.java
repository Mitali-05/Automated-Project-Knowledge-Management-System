package com.pkm.activity;

import java.time.Instant;

public record ActivityDto(Long id, Long projectId, String projectName, String type, String title, String actor,
                          String repositoryUrl, String sourceRef, String url, Instant occurredAt) {

    /** Call inside a transaction (the project is lazy). */
    public static ActivityDto from(ProjectActivity a) {
        return new ActivityDto(a.getId(), a.getProject().getId(), a.getProject().getName(), a.getEventType(),
                a.getTitle(), a.getActorName(), a.getRepositoryUrl(), a.getSourceRef(), a.getUrl(), a.getOccurredAt());
    }
}

package com.pkm.project.dto;

import com.pkm.project.ProjectRepositoryLink;

import java.time.Instant;

public record RepositoryDto(Long id, String provider, String url, String owner, String name, String syncStatus,
                            Instant lastSyncedAt, String lastSyncMessage, Instant addedAt) {

    public static RepositoryDto from(ProjectRepositoryLink r) {
        return new RepositoryDto(r.getId(), r.getProvider(), r.getUrl(), r.getRepoOwner(), r.getRepoName(),
                r.getSyncStatus().name(), r.getLastSyncedAt(), r.getLastSyncMessage(), r.getAddedAt());
    }
}

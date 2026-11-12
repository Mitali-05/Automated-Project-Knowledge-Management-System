package com.pkm.ingest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.util.List;

/** Request/response shapes of the extraction-service API. See docs/INTEGRATION.md. */
public final class IngestDtos {

    private IngestDtos() {
    }

    public record PendingRepository(Long repositoryId, Long projectId, String projectName, String url,
                                    String owner, String name, String syncStatus, String githubInstallationId) {
    }

    public record StatusUpdate(
            @NotBlank(message = "status is required")
            @Pattern(regexp = "SYNCING|SYNCED|FAILED", message = "status must be SYNCING, SYNCED or FAILED") String status,
            @Size(max = 500, message = "message is too long") String message) {
    }

    public record TokenResponse(String token) {
    }

    public record EvidenceIn(
            @NotBlank @Size(max = 30) String type,
            @NotBlank @Size(max = 512) String reference,
            @Size(max = 1024) String url,
            @Size(max = 4000) String excerpt) {
    }

    public record KnowledgeIn(
            /** Stable id from the extractor; re-sending the same id updates the item. */
            @Size(max = 128) String externalId,
            @NotBlank @Size(max = 512) String title,
            @NotBlank @Size(max = 50) String type,
            @NotBlank @Size(max = 8000) String summary,
            @Size(max = 20000) String details,
            @Size(max = 255) String module,
            @DecimalMin("0.0") @DecimalMax("1.0") Double confidence,
            @Valid @Size(max = 50) List<EvidenceIn> evidence) {
    }

    public record KnowledgeBatch(
            Long repositoryId,
            @NotNull @Size(min = 1, max = 500, message = "send between 1 and 500 items") List<@Valid KnowledgeIn> items) {
    }

    public record ActivityIn(
            @NotBlank @Size(max = 40) String type,
            @NotBlank @Size(max = 512) String title,
            @Size(max = 255) String actor,
            Long repositoryId,
            @Size(max = 255) String sourceRef,
            @Size(max = 1024) String url,
            Instant occurredAt) {
    }

    public record ActivityBatch(
            @NotNull @Size(min = 1, max = 1000, message = "send between 1 and 1000 events") List<@Valid ActivityIn> events) {
    }

    public record BatchResult(int created, int updated) {
    }
}

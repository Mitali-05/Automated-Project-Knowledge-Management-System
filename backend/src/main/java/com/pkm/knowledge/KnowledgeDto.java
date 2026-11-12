package com.pkm.knowledge;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

public record KnowledgeDto(
        Long id, Long projectId, String title, String type, String summary, String details, String module,
        Double confidence, String freshness, String repositoryUrl, Instant createdAt, Instant updatedAt,
        List<EvidenceDto> sources) {

    public record EvidenceDto(Long id, String type, String reference, String url, String excerpt) {
    }

    /** Freshness is derived from the age of the item so it never needs to be maintained by hand. */
    static String freshnessOf(Instant updatedAt) {
        long days = Duration.between(updatedAt, Instant.now()).toDays();
        if (days <= 30) {
            return "Fresh";
        }
        return days <= 90 ? "Stale" : "Outdated";
    }

    /** Call inside a transaction (evidence and repository are lazy). */
    public static KnowledgeDto from(KnowledgeItem k) {
        List<EvidenceDto> sources = k.getEvidence().stream()
                .map(e -> new EvidenceDto(e.getId(), e.getSourceType(), e.getSourceRef(), e.getUrl(), e.getExcerpt()))
                .toList();
        return new KnowledgeDto(k.getId(), k.getProject().getId(), k.getTitle(), k.getKnowledgeType(),
                k.getSummary(), k.getDetails(), k.getModule(), k.getConfidence(), freshnessOf(k.getUpdatedAt()),
                k.getRepository() == null ? null : k.getRepository().getUrl(),
                k.getCreatedAt(), k.getUpdatedAt(), sources);
    }
}

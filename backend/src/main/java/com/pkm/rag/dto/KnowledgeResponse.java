package com.pkm.rag.dto;

import java.util.List;

public record KnowledgeResponse(
        String id,
        String projectId,
        String title,
        String description,
        String type,
        String freshness,
        String module,
        String confidence,
        List<Source> sources,
        String updatedAt
) {
    public record Source(String id, String type, String reference, String url) {}
}

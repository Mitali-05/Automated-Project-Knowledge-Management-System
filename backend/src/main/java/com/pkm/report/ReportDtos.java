package com.pkm.report;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.List;

public final class ReportDtos {

    private ReportDtos() {
    }

    /** {@code report} is the extractor's JSON, passed through unchanged for the Report tab to render. */
    public record RepositoryReportDto(Long repositoryId, String owner, String name, String url, Instant generatedAt,
                                      List<String> files, JsonNode report) {
    }
}

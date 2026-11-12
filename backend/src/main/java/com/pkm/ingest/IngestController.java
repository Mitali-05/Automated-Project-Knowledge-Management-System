package com.pkm.ingest;

import com.fasterxml.jackson.databind.JsonNode;
import com.pkm.ingest.IngestDtos.*;
import com.pkm.report.ReportService;
import com.pkm.project.ProjectRepositoryLink.SyncStatus;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * API used by the Python extraction service (not by the browser). Authenticated with the
 * X-Service-Key header - see ServiceKeyFilter and docs/INTEGRATION.md.
 */
@RestController
@RequestMapping("/api/ingest")
public class IngestController {

    private final IngestService service;
    private final ReportService reportService;

    public IngestController(IngestService service, ReportService reportService) {
        this.service = service;
        this.reportService = reportService;
    }

    /** Repositories waiting for extraction: GET /api/ingest/repositories?status=PENDING */
    @GetMapping("/repositories")
    public List<PendingRepository> repositories(@RequestParam(defaultValue = "PENDING") String status) {
        return service.repositories(parse(status));
    }

    /** Short-lived GitHub token for a private repository of a connected organization. */
    @PostMapping("/repositories/{repositoryId}/github-token")
    public TokenResponse githubToken(@PathVariable Long repositoryId) {
        return service.githubToken(repositoryId);
    }

    @PostMapping("/repositories/{repositoryId}/status")
    public ResponseEntity<Void> status(@PathVariable Long repositoryId, @Valid @RequestBody StatusUpdate update) {
        service.updateStatus(repositoryId, update);
        return ResponseEntity.noContent().build();
    }

    /** The extractor's full report JSON (architecture, handover guide, verification...) for one repository. */
    @PutMapping("/repositories/{repositoryId}/report")
    public ResponseEntity<Void> report(@PathVariable Long repositoryId, @RequestBody JsonNode report) {
        reportService.saveReport(repositoryId, report);
        return ResponseEntity.noContent().build();
    }

    /** A generated download. kind = pdf | pptx, body = the raw file bytes (application/octet-stream). */
    @PutMapping(value = "/repositories/{repositoryId}/report/files/{kind}", consumes = "application/octet-stream")
    public ResponseEntity<Void> reportFile(@PathVariable Long repositoryId, @PathVariable String kind,
                                           @RequestBody byte[] content) {
        reportService.saveFile(repositoryId, kind, content);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{projectId}/knowledge")
    public BatchResult knowledge(@PathVariable Long projectId, @Valid @RequestBody KnowledgeBatch batch) {
        return service.saveKnowledge(projectId, batch);
    }

    @PostMapping("/projects/{projectId}/activity")
    public BatchResult activity(@PathVariable Long projectId, @Valid @RequestBody ActivityBatch batch) {
        return service.saveActivity(projectId, batch);
    }

    private static SyncStatus parse(String status) {
        if ("ALL".equalsIgnoreCase(status)) {
            return null;
        }
        try {
            return SyncStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw com.pkm.common.ApiException.badRequest("status must be PENDING, SYNCING, SYNCED, FAILED or ALL");
        }
    }
}

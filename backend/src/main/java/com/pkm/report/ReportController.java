package com.pkm.report;

import com.pkm.common.CurrentUser;
import com.pkm.report.ReportDtos.RepositoryReportDto;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/reports")
public class ReportController {

    private static final MediaType PPTX = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.presentationml.presentation");

    private final ReportService service;

    public ReportController(ReportService service) {
        this.service = service;
    }

    @GetMapping
    public List<RepositoryReportDto> list(@PathVariable Long projectId) {
        return service.list(projectId, CurrentUser.id());
    }

    @GetMapping("/{repositoryId}/download/{kind}")
    public ResponseEntity<byte[]> download(@PathVariable Long projectId, @PathVariable Long repositoryId,
                                           @PathVariable String kind) {
        ReportService.Download d = service.download(projectId, repositoryId, kind, CurrentUser.id());
        return ResponseEntity.ok()
                .contentType(d.kind().equals("pdf") ? MediaType.APPLICATION_PDF : PPTX)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(d.filename()).build().toString())
                .body(d.content());
    }
}

package com.pkm.report;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkm.common.ApiException;
import com.pkm.project.ProjectAccess;
import com.pkm.project.ProjectRepositoryLink;
import com.pkm.project.ProjectRepositoryLinkRepository;
import com.pkm.report.ReportDtos.RepositoryReportDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class ReportService {

    private static final int MAX_REPORT_CHARS = 3_000_000;
    private static final int MAX_FILE_BYTES = 30 * 1024 * 1024;
    private static final Set<String> KINDS = Set.of("pdf", "pptx");

    private final RepositoryReportRepository reports;
    private final RepositoryReportFileRepository files;
    private final ProjectRepositoryLinkRepository repoLinks;
    private final ProjectAccess access;
    private final ObjectMapper mapper;

    public ReportService(RepositoryReportRepository reports, RepositoryReportFileRepository files,
                         ProjectRepositoryLinkRepository repoLinks, ProjectAccess access, ObjectMapper mapper) {
        this.reports = reports;
        this.files = files;
        this.repoLinks = repoLinks;
        this.access = access;
        this.mapper = mapper;
    }

    // ------------------------------------------------------------------ used by the extractor (ingest API)

    @Transactional
    public void saveReport(Long repositoryId, JsonNode report) {
        ProjectRepositoryLink repo = repoLinks.findById(repositoryId)
                .orElseThrow(() -> ApiException.notFound("Repository not found"));
        String json = report.toString();
        if (json.length() > MAX_REPORT_CHARS) {
            throw ApiException.badRequest("Report is too large");
        }
        RepositoryReport row = reports.findById(repositoryId).orElseGet(RepositoryReport::new);
        row.setRepositoryId(repositoryId);
        row.setProjectId(repo.getProject().getId());
        row.setReport(json);
        row.setGeneratedAt(Instant.now());
        reports.save(row);
    }

    @Transactional
    public void saveFile(Long repositoryId, String kind, byte[] content) {
        String k = kind.toLowerCase(Locale.ROOT);
        if (!KINDS.contains(k)) {
            throw ApiException.badRequest("kind must be pdf or pptx");
        }
        if (content == null || content.length == 0) {
            throw ApiException.badRequest("File is empty");
        }
        if (content.length > MAX_FILE_BYTES) {
            throw ApiException.badRequest("File is too large");
        }
        if (!repoLinks.existsById(repositoryId)) {
            throw ApiException.notFound("Repository not found");
        }
        RepositoryReportFile row = files.findByRepositoryIdAndKind(repositoryId, k).orElseGet(RepositoryReportFile::new);
        row.setRepositoryId(repositoryId);
        row.setKind(k);
        row.setContent(content);
        row.setSizeBytes(content.length);
        row.setCreatedAt(Instant.now());
        files.save(row);
    }

    // ------------------------------------------------------------------ used by the web app

    @Transactional(readOnly = true)
    public List<RepositoryReportDto> list(Long projectId, Long userId) {
        access.requireMember(projectId, userId);
        List<RepositoryReport> rows = reports.findByProjectIdOrderByGeneratedAtDesc(projectId);
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<Long, ProjectRepositoryLink> links = new HashMap<>();
        repoLinks.findByProjectIdOrderByAddedAtAsc(projectId).forEach(l -> links.put(l.getId(), l));
        if (links.isEmpty()) {
            return List.of();
        }
        Map<Long, List<String>> kinds = new HashMap<>();
        for (Object[] r : files.findKinds(links.keySet())) {
            kinds.computeIfAbsent(((Number) r[0]).longValue(), x -> new ArrayList<>()).add((String) r[1]);
        }
        List<RepositoryReportDto> out = new ArrayList<>();
        for (RepositoryReport row : rows) {
            ProjectRepositoryLink link = links.get(row.getRepositoryId());
            if (link == null) {
                continue;
            }
            JsonNode node;
            try {
                node = mapper.readTree(row.getReport());
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Stored report JSON is invalid for repository " + row.getRepositoryId(), e);
            }
            List<String> have = kinds.getOrDefault(row.getRepositoryId(), List.of()).stream().sorted().toList();
            out.add(new RepositoryReportDto(link.getId(), link.getRepoOwner(), link.getRepoName(), link.getUrl(),
                    row.getGeneratedAt(), have, node));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public Download download(Long projectId, Long repositoryId, String kind, Long userId) {
        access.requireMember(projectId, userId);
        ProjectRepositoryLink link = repoLinks.findById(repositoryId)
                .filter(l -> l.getProject().getId().equals(projectId))
                .orElseThrow(() -> ApiException.notFound("Repository not found"));
        RepositoryReportFile file = files.findByRepositoryIdAndKind(repositoryId, kind.toLowerCase(Locale.ROOT))
                .orElseThrow(() -> ApiException.notFound("This file has not been generated yet"));
        String base = (link.getRepoOwner() + "-" + link.getRepoName()).replaceAll("[^A-Za-z0-9._-]", "_");
        return new Download(base + (file.getKind().equals("pdf") ? "-report.pdf" : "-deck.pptx"),
                file.getKind(), file.getContent());
    }

    public record Download(String filename, String kind, byte[] content) {
    }
}

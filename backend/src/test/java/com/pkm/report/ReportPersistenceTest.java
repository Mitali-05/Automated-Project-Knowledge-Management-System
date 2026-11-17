package com.pkm.report;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkm.project.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReportPersistenceTest {
    @Test
    void downloadReturnsStoredDatabaseBytesWithMembershipCheck() {
        var reports = mock(RepositoryReportRepository.class);
        var files = mock(RepositoryReportFileRepository.class);
        var links = mock(ProjectRepositoryLinkRepository.class);
        var access = mock(ProjectAccess.class);
        var project = new Project(); project.setId(7L);
        var link = new ProjectRepositoryLink(); link.setId(3L); link.setProject(project);
        link.setRepoOwner("qa"); link.setRepoName("repo");
        when(links.existsById(3L)).thenReturn(true);
        when(links.findById(3L)).thenReturn(Optional.of(link));
        when(files.findByRepositoryIdAndKind(3L, "pdf")).thenReturn(Optional.empty());
        var service = new ReportService(reports, files, links, access, new ObjectMapper());
        byte[] generated = new byte[] {37, 80, 68, 70};
        service.saveFile(3L, "pdf", generated);
        var saved = ArgumentCaptor.forClass(RepositoryReportFile.class);
        verify(files).save(saved.capture());
        when(files.findByRepositoryIdAndKind(3L, "pdf")).thenReturn(Optional.of(saved.getValue()));
        assertArrayEquals(generated, service.download(7L, 3L, "pdf", 11L).content());
        verify(access).requireMember(7L, 11L);
    }
}

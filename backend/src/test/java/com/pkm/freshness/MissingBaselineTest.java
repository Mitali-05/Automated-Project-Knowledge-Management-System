package com.pkm.freshness;

import com.pkm.integration.github.GitHubAppService;
import com.pkm.knowledge.KnowledgeItemRepository;
import com.pkm.project.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MissingBaselineTest {
    @Test
    void itemsWithoutFreshnessRowsAreUnknown() {
        var knowledge = mock(KnowledgeItemRepository.class);
        when(knowledge.countByProjectId(7L)).thenReturn(12L);
        var service = new FreshnessService(mock(RepositorySnapshotRepository.class),
            mock(RepositoryChangeRepository.class), mock(KnowledgeFreshnessRepository.class),
            mock(KnowledgeChangeLinkRepository.class), knowledge, mock(ProjectRepository.class),
            mock(ProjectRepositoryLinkRepository.class), mock(ProjectAccess.class), mock(GitHubAppService.class));
        var overview = service.getOverview(7L, 1L);
        assertEquals(12L, overview.unknownCount());
        assertEquals(0L, overview.currentCount());
    }
}

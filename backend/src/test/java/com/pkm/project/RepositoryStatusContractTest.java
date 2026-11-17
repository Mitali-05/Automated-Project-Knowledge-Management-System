package com.pkm.project;

import com.pkm.project.dto.RepositoryDto;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RepositoryStatusContractTest {
    @Test
    void failedStatusAndStoredReasonMatchFrontendContract() {
        var repository = new ProjectRepositoryLink();
        repository.setSyncStatus(ProjectRepositoryLink.SyncStatus.FAILED);
        repository.setLastSyncMessage("Diagram parsing failed");
        var dto = RepositoryDto.from(repository);
        assertEquals("Failed", dto.syncStatus());
        assertEquals("Diagram parsing failed", dto.lastSyncMessage());
    }
}

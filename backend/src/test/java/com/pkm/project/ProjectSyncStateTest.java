package com.pkm.project;

import com.pkm.project.ProjectRepositoryLink.SyncStatus;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ProjectSyncStateTest {
    @Test
    void distinguishesEmptyQueuedRunningAndPartialProjects() {
        assertEquals("No repositories", ProjectService.aggregateStatus(List.of()));
        assertEquals("Queued", ProjectService.aggregateStatus(List.of(repository(SyncStatus.PENDING))));
        assertEquals("Syncing", ProjectService.aggregateStatus(
                List.of(repository(SyncStatus.PENDING), repository(SyncStatus.SYNCING))));
        assertEquals("Partially synced", ProjectService.aggregateStatus(
                List.of(repository(SyncStatus.FAILED), repository(SyncStatus.SYNCED))));
        assertEquals("Failed", ProjectService.aggregateStatus(List.of(repository(SyncStatus.FAILED))));
        assertEquals("Synced", ProjectService.aggregateStatus(List.of(repository(SyncStatus.SYNCED))));
    }

    private static ProjectRepositoryLink repository(SyncStatus status) {
        ProjectRepositoryLink link = new ProjectRepositoryLink();
        link.setSyncStatus(status);
        return link;
    }
}

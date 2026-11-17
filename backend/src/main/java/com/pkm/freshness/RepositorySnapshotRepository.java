package com.pkm.freshness;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface RepositorySnapshotRepository extends JpaRepository<RepositorySnapshot, Long> {

    @Query("select s from RepositorySnapshot s where s.repository.id = :repositoryId order by s.createdAt desc")
    List<RepositorySnapshot> findByRepositoryOrderByCreatedAtDesc(Long repositoryId);

    @Query("select s from RepositorySnapshot s where s.repository.id = :repositoryId and s.syncStatus = 'SYNCED' order by s.createdAt desc")
    List<RepositorySnapshot> findSuccessfulSnapshots(Long repositoryId);

    Optional<RepositorySnapshot> findFirstByRepositoryIdAndSyncStatusOrderByCreatedAtDesc(Long repositoryId, String syncStatus);

    List<RepositorySnapshot> findByProjectIdOrderByCreatedAtDesc(Long projectId);
}

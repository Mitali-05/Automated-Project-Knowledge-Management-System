package com.pkm.report;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RepositoryReportFileRepository extends JpaRepository<RepositoryReportFile, Long> {

    Optional<RepositoryReportFile> findByRepositoryIdAndKind(Long repositoryId, String kind);

    /** Rows of [repositoryId, kind] - lists what exists without loading the file contents. */
    @Query("select f.repositoryId, f.kind from RepositoryReportFile f where f.repositoryId in :repositoryIds")
    List<Object[]> findKinds(Collection<Long> repositoryIds);
}

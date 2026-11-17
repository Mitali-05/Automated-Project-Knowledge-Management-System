package com.pkm.project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ExtractionJobRepository extends JpaRepository<ExtractionJob, Long> {

    List<ExtractionJob> findByProjectIdOrderByStartedAtDesc(Long projectId);

    Optional<ExtractionJob> findFirstByProjectIdOrderByStartedAtDesc(Long projectId);

    Optional<ExtractionJob> findFirstByRepositoryIdOrderByStartedAtDesc(Long repositoryId);

    List<ExtractionJob> findByProjectIdAndStatusInOrderByStartedAtDesc(Long projectId, Collection<String> statuses);

    @Query("SELECT j FROM ExtractionJob j WHERE j.project.id = :projectId AND j.status IN ('PENDING', 'RUNNING') ORDER BY j.startedAt DESC")
    List<ExtractionJob> findActiveJobs(@Param("projectId") Long projectId);
}

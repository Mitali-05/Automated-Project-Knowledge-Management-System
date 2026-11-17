package com.pkm.freshness;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepositoryChangeRepository extends JpaRepository<RepositoryChange, Long> {

    List<RepositoryChange> findByProjectIdOrderByDetectedAtDesc(Long projectId);

    List<RepositoryChange> findByRepositoryIdOrderByDetectedAtDesc(Long repositoryId);

    boolean existsByRepositoryIdAndToCommitAndFilePath(Long repositoryId, String toCommit, String filePath);
}

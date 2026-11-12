package com.pkm.report;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepositoryReportRepository extends JpaRepository<RepositoryReport, Long> {

    List<RepositoryReport> findByProjectIdOrderByGeneratedAtDesc(Long projectId);
}

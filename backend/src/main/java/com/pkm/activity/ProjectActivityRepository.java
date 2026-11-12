package com.pkm.activity;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface ProjectActivityRepository extends JpaRepository<ProjectActivity, Long> {

    List<ProjectActivity> findByProjectIdOrderByOccurredAtDesc(Long projectId, Pageable pageable);

    long countByProjectId(Long projectId);

    @Query("select a from ProjectActivity a join fetch a.project where a.project.id in :projectIds order by a.occurredAt desc")
    List<ProjectActivity> findRecentForProjects(Collection<Long> projectIds, Pageable pageable);
}

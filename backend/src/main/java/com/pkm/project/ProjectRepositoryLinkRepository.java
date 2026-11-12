package com.pkm.project;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ProjectRepositoryLinkRepository extends JpaRepository<ProjectRepositoryLink, Long> {

    List<ProjectRepositoryLink> findByProjectIdOrderByAddedAtAsc(Long projectId);

    boolean existsByProjectIdAndUrlIgnoreCase(Long projectId, String url);

    long countByProjectId(Long projectId);

    List<ProjectRepositoryLink> findByProjectIdIn(Collection<Long> projectIds);
}

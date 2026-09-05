package com.pkm.rag.entity;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProjectRepositoryRepo extends JpaRepository<ProjectRepositoryEntity, Long> {
    List<ProjectRepositoryEntity> findByProjectId(Long projectId);
    long countByProjectOrganizationId(Long orgId);
}

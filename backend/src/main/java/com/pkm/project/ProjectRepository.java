package com.pkm.project;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    Optional<Project> findByOrganizationIdAndNameIgnoreCase(Long orgId, String name);
    long countByOrganizationId(Long organizationId);
}

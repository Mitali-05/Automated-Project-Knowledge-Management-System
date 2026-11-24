package com.pkm.project;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Project p where p.id = :id")
    java.util.Optional<Project> lockForOwnershipTransfer(@Param("id") Long id);

    @Query("select p.organization.id from Project p where p.id = :id")
    java.util.Optional<Long> findOrganizationId(@Param("id") Long id);


    long countByOrganizationId(Long organizationId);

    java.util.List<Project> findByOrganizationId(Long organizationId);
}

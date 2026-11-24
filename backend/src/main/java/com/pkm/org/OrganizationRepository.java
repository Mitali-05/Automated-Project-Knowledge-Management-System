package com.pkm.org;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Organization o where o.id = :id")
    java.util.Optional<Organization> lockForOwnershipTransfer(@Param("id") Long id);


    boolean existsByNameIgnoreCaseAndType(String name, Organization.Type type);

    Optional<Organization> findByInviteCode(String inviteCode);

    Optional<Organization> findByPersonalUserId(Long userId);

    Optional<Organization> findByGithubInstallationId(String githubInstallationId);
}

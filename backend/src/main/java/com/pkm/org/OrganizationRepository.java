package com.pkm.org;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    boolean existsByNameIgnoreCaseAndType(String name, Organization.Type type);

    Optional<Organization> findByInviteCode(String inviteCode);

    Optional<Organization> findByPersonalUserId(Long userId);

    Optional<Organization> findByGithubInstallationId(String githubInstallationId);
}

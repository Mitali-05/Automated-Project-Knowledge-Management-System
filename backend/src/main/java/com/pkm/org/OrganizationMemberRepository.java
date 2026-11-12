package com.pkm.org;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, Long> {

    /** Personal workspace first, then team organizations alphabetically. */
    @Query("select m from OrganizationMember m join fetch m.organization o where m.user.id = :userId "
            + "order by o.type asc, lower(o.name) asc")
    List<OrganizationMember> findByUserIdWithOrganization(Long userId);

    @Query("select m from OrganizationMember m join fetch m.organization where m.organization.id = :orgId and m.user.id = :userId")
    Optional<OrganizationMember> findMembership(Long orgId, Long userId);

    @Query("select m from OrganizationMember m join fetch m.user where m.organization.id = :orgId order by m.joinedAt asc")
    List<OrganizationMember> findByOrganizationIdWithUser(Long orgId);

    boolean existsByOrganizationIdAndUserId(Long organizationId, Long userId);

    long countByOrganizationId(Long organizationId);
}

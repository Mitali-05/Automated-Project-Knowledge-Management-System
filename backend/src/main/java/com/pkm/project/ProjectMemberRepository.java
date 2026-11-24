package com.pkm.project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    @Query("select m from ProjectMember m join fetch m.project p where m.user.id = :userId order by p.updatedAt desc")
    List<ProjectMember> findByUserIdWithProject(Long userId);

    Optional<ProjectMember> findByProjectIdAndUserId(Long projectId, Long userId);

    @Query("select m from ProjectMember m join fetch m.user where m.project.id = :projectId order by m.addedAt asc")
    List<ProjectMember> findByProjectIdWithUser(Long projectId);

    long countByProjectId(Long projectId);

    long countByProjectIdAndRole(Long projectId, ProjectMember.Role role);

    /** How many projects of one organization the user is on. */
    @Query("select count(m) from ProjectMember m where m.user.id = :userId and m.project.organization.id = :orgId")
    long countByUserInOrg(Long userId, Long orgId);

    @Query("select count(m) from ProjectMember m where m.user.id = :userId and m.role = :role "
            + "and m.project.id in (select p.id from Project p where p.organization.id = :orgId)")
    long countByUserInOrgWithRole(Long userId, Long orgId, ProjectMember.Role role);

    @Query("select m.project from ProjectMember m where m.user.id = :userId and m.role = :role "
            + "and m.project.id in (select p.id from Project p where p.organization.id = :orgId)")
    List<Project> findByUserInOrgWithRole(Long userId, Long orgId, ProjectMember.Role role);

    /** Used when someone leaves or is removed from an organization: they lose access to its projects. */
    @Modifying
    @Query("delete from ProjectMember m where m.user.id = :userId "
            + "and m.project.id in (select p.id from Project p where p.organization.id = :orgId)")
    void deleteByUserInOrg(Long userId, Long orgId);
}

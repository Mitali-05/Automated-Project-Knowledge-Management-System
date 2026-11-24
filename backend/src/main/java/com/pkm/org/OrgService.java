package com.pkm.org;

import com.pkm.common.ApiException;
import com.pkm.project.Project;
import com.pkm.project.ProjectMember;
import com.pkm.project.ProjectMemberRepository;
import com.pkm.project.ProjectRepository;
import com.pkm.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class OrgService {

    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 10;

    private final SecureRandom random = new SecureRandom();
    private final OrganizationRepository organizations;
    private final OrganizationMemberRepository members;
    private final ProjectMemberRepository projectMembers;
    private final ProjectRepository projects;
    private final OrgAccess access;

    public OrgService(OrganizationRepository organizations, OrganizationMemberRepository members,
                      ProjectMemberRepository projectMembers, ProjectRepository projects, OrgAccess access) {
        this.organizations = organizations;
        this.members = members;
        this.projectMembers = projectMembers;
        this.projects = projects;
        this.access = access;
    }

    // ------------------------------------------------------------------ queries

    /** Every organization the caller belongs to: personal workspace first, then teams. */
    public List<OrgDtos.Summary> list(Long userId) {
        return members.findByUserIdWithOrganization(userId).stream().map(m -> summarize(m, userId)).toList();
    }

    public OrgDtos.Detail get(Long orgId, Long userId) {
        OrganizationMember me = access.requireMember(orgId, userId);
        List<OrgDtos.Member> list = members.findByOrganizationIdWithUser(orgId).stream()
                .map(OrgDtos.Member::from).toList();
        return new OrgDtos.Detail(summarize(me, userId), list);
    }

    // ------------------------------------------------------------------ lifecycle

    /** Called once at signup. */
    @Transactional
    public Organization createPersonalWorkspace(User user) {
        Organization org = new Organization();
        org.setName(truncate(user.getName(), 100) + "'s workspace");
        org.setType(Organization.Type.PERSONAL);
        org.setPersonalUserId(user.getId());
        org = organizations.save(org);
        addMember(org, user, OrganizationMember.Role.owner);
        return org;
    }

    @Transactional
    public OrgDtos.Summary create(Long userId, User creator, String name) {
        String clean = name.trim();
        if (organizations.existsByNameIgnoreCaseAndType(clean, Organization.Type.TEAM)) {
            throw ApiException.conflict("An organization with this name already exists. Pick another name, "
                    + "or ask its owner for an invite code.");
        }
        Organization org = new Organization();
        org.setName(clean);
        org.setType(Organization.Type.TEAM);
        org.setInviteCode(generateInviteCode());
        org = organizations.save(org);
        OrganizationMember me = addMember(org, creator, OrganizationMember.Role.owner);
        return summarize(me, userId);
    }

    @Transactional
    public OrgDtos.Summary join(Long userId, User user, String inviteCode) {
        // The same message for "wrong code" and "unknown code" so codes cannot be probed.
        Organization org = organizations.findByInviteCode(inviteCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> ApiException.notFound("That invite code is not valid"));
        if (members.existsByOrganizationIdAndUserId(org.getId(), userId)) {
            throw ApiException.conflict("You are already a member of " + org.getName());
        }
        OrganizationMember me = addMember(org, user, OrganizationMember.Role.member);
        return summarize(me, userId);
    }

    @Transactional
    public OrgDtos.Summary rename(Long orgId, Long userId, String name) {
        OrganizationMember me = access.requireAdmin(orgId, userId);
        Organization org = me.getOrganization();   // personal workspaces can be renamed too
        String clean = name.trim();
        if (org.getType() == Organization.Type.TEAM && !clean.equalsIgnoreCase(org.getName())
                && organizations.existsByNameIgnoreCaseAndType(clean, Organization.Type.TEAM)) {
            throw ApiException.conflict("An organization with this name already exists");
        }
        org.setName(clean);
        organizations.save(org);
        return summarize(me, userId);
    }

    @Transactional
    public OrgDtos.Summary rotateInviteCode(Long orgId, Long userId) {
        OrganizationMember me = access.requireAdmin(orgId, userId);
        Organization org = requireTeam(me);
        org.setInviteCode(generateInviteCode());
        organizations.save(org);
        return summarize(me, userId);
    }

    /** Only the owner. If deleteAllProjects is true, all projects in the organization are deleted. */
    @Transactional
    public void delete(Long orgId, Long userId, boolean deleteAllProjects) {
        OrganizationMember me = access.requireOwner(orgId, userId);
        Organization org = requireTeam(me);
        List<Project> orgProjects = projects.findByOrganizationId(orgId);
        if (!orgProjects.isEmpty()) {
            if (!deleteAllProjects) {
                throw ApiException.conflict("Delete all projects in this organization first, or check the box to delete all projects.");
            }
            projects.deleteAll(orgProjects);
        }
        organizations.delete(org);   // memberships are removed by the database (ON DELETE CASCADE)
    }

    @Transactional
    public void delete(Long orgId, Long userId) {
        delete(orgId, userId, false);
    }

    // ------------------------------------------------------------------ members

    /** The owner can manage admin and member roles. */
    @Transactional
    public OrgDtos.Member setRole(Long orgId, Long userId, Long targetUserId, String role) {
        OrganizationMember me = access.requireOwner(orgId, userId);
        requireTeam(me);
        OrganizationMember target = members.findMembership(orgId, targetUserId)
                .orElseThrow(() -> ApiException.notFound("Member not found"));
        if (target.getRole() == OrganizationMember.Role.owner || "owner".equals(role)) {
            throw ApiException.badRequest("Use the ownership transfer endpoint to change the owner");
        }
        target.setRole(OrganizationMember.Role.valueOf(role));
        return OrgDtos.Member.from(members.save(target));
    }

    /** Owners can remove anyone but themselves; admins can remove plain members. */
    @Transactional
    public void transferOwnership(Long orgId, Long userId, Long targetUserId, boolean retainOwnership) {
        organizations.lockForOwnershipTransfer(orgId)
                .orElseThrow(() -> ApiException.notFound("Organization not found"));
        OrganizationMember owner = access.requireOwner(orgId, userId);
        requireTeam(owner);
        if (userId.equals(targetUserId)) return;
        OrganizationMember target = members.findMembership(orgId, targetUserId)
                .orElseThrow(() -> ApiException.notFound("Member not found"));
        target.setRole(OrganizationMember.Role.owner);
        if (!retainOwnership) owner.setRole(OrganizationMember.Role.admin);
    }

    @Transactional
    public void removeMember(Long orgId, Long userId, Long targetUserId, boolean deleteOwnedProjects) {
        access.lockOrganization(orgId);
        OrganizationMember me = access.requireAdmin(orgId, userId);
        requireTeam(me);
        if (targetUserId.equals(userId)) {
            throw ApiException.badRequest("Use \"Leave organization\" to remove yourself");
        }
        OrganizationMember target = members.findMembership(orgId, targetUserId)
                .orElseThrow(() -> ApiException.notFound("Member not found"));
        if (target.getRole() == OrganizationMember.Role.owner) {
            throw ApiException.badRequest("The organization owner cannot be removed");
        }
        if (me.getRole() == OrganizationMember.Role.admin && target.getRole() != OrganizationMember.Role.member) {
            throw ApiException.forbidden("Admins can only remove regular members");
        }
        detach(target, orgId, deleteOwnedProjects);
    }

    @Transactional
    public void removeMember(Long orgId, Long userId, Long targetUserId) {
        removeMember(orgId, userId, targetUserId, false);
    }

    @Transactional
    public void leave(Long orgId, Long userId) {
        access.lockOrganization(orgId);
        OrganizationMember me = access.requireMember(orgId, userId);
        requireTeam(me);
        if (me.getRole() == OrganizationMember.Role.owner) {
            throw ApiException.badRequest("Transfer organization ownership before leaving.");
        }
        detach(me, orgId, false);
    }

    // ------------------------------------------------------------------ helpers

    public record ProjectOwnershipBlocker(Long id, String name) {}

    @Transactional(readOnly = true)
    public List<ProjectOwnershipBlocker> projectOwnershipBlockers(Long orgId, Long userId) {
        requireTeam(access.requireMember(orgId, userId));
        return projectMembers.findSoleOwnedProjectsInOrg(userId, orgId, ProjectMember.Role.owner).stream()
                .map(p -> new ProjectOwnershipBlocker(p.getId(), p.getName()))
                .toList();
    }

    /** Removes the membership and the person's access to every project of that organization. */
    private void detach(OrganizationMember member, Long orgId, boolean deleteOwnedProjects) {
        Long uid = member.getUser().getId();
        List<Project> owned = projectMembers.findSoleOwnedProjectsInOrg(uid, orgId, ProjectMember.Role.owner);
        if (!owned.isEmpty()) {
            if (!deleteOwnedProjects) {
                throw ApiException.conflict("This person still owns projects in the organization. "
                        + "Transfer ownership where they are the only owner before removing their membership.");
            }
            projects.deleteAll(owned);
        }
        projectMembers.deleteByUserInOrg(uid, orgId);
        members.delete(member);
    }

    private OrganizationMember addMember(Organization org, User user, OrganizationMember.Role role) {
        OrganizationMember m = new OrganizationMember();
        m.setOrganization(org);
        m.setUser(user);
        m.setRole(role);
        return members.save(m);
    }

    private Organization requireTeam(OrganizationMember me) {
        Organization org = me.getOrganization();
        if (org.getType() == Organization.Type.PERSONAL) {
            throw ApiException.badRequest("This is your personal workspace and cannot be changed this way");
        }
        return org;
    }

    private OrgDtos.Summary summarize(OrganizationMember m, Long userId) {
        Organization org = m.getOrganization();
        boolean admin = m.getRole() != OrganizationMember.Role.member;
        String code = admin && org.getType() == Organization.Type.TEAM ? org.getInviteCode() : null;
        return new OrgDtos.Summary(org.getId(), org.getName(), org.getType().name(), m.getRole().name(),
                (int) members.countByOrganizationId(org.getId()), projectMembers.countByUserInOrg(userId, org.getId()),
                org.getGithubInstallationId() != null && !org.getGithubInstallationId().isBlank(),
                code, org.getCreatedAt());
    }

    private String generateInviteCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }
}

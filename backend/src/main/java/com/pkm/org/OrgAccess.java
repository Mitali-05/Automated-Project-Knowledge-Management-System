package com.pkm.org;

import com.pkm.common.ApiException;
import org.springframework.stereotype.Component;

/**
 * Central organization access rules. Like projects, an organization the caller does not belong to is reported
 * as "not found" so outsiders cannot learn that it exists.
 */
@Component
public class OrgAccess {

    private final OrganizationMemberRepository members;
    private final OrganizationRepository organizations;

    public OrgAccess(OrganizationMemberRepository members, OrganizationRepository organizations) {
        this.members = members;
        this.organizations = organizations;
    }

    public void lockOrganization(Long orgId) {
        organizations.lockForOwnershipTransfer(orgId)
                .orElseThrow(() -> ApiException.notFound("Organization not found"));
    }

    public OrganizationMember requireMember(Long orgId, Long userId) {
        return members.findMembership(orgId, userId)
                .orElseThrow(() -> ApiException.notFound("Organization not found"));
    }

    /** Owner or admin. */
    public OrganizationMember requireAdmin(Long orgId, Long userId) {
        OrganizationMember m = requireMember(orgId, userId);
        if (m.getRole() == OrganizationMember.Role.member) {
            throw ApiException.forbidden("Only organization owners and admins can do this");
        }
        return m;
    }

    public OrganizationMember requireOwner(Long orgId, Long userId) {
        OrganizationMember m = requireMember(orgId, userId);
        if (m.getRole() != OrganizationMember.Role.owner) {
            throw ApiException.forbidden("Only the organization owner can do this");
        }
        return m;
    }
}

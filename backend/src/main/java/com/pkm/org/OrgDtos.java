package com.pkm.org;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/** Request/response shapes of the organization API. */
public final class OrgDtos {

    private OrgDtos() {
    }

    /** {@code inviteCode} is only filled in for owners/admins of TEAM organizations. */
    public record Summary(Long id, String name, String type, String role, int memberCount, long projectCount,
                          boolean githubConnected, String inviteCode, Instant createdAt) {
    }

    public record Member(Long userId, String name, String email, String role, Instant joinedAt) {
        /** Call inside a transaction (the user is lazy). */
        public static Member from(OrganizationMember m) {
            return new Member(m.getUser().getId(), m.getUser().getName(), m.getUser().getEmail(),
                    m.getRole().name(), m.getJoinedAt());
        }
    }

    public record Detail(Summary organization, List<Member> members) {
    }

    public record NameRequest(
            @NotBlank(message = "Organization name is required")
            @Size(max = 150, message = "Organization name must be at most 150 characters") String name) {
    }

    public record JoinRequest(
            @NotBlank(message = "Invite code is required")
            @Size(max = 32, message = "Invite code is too long") String inviteCode) {
    }

    public record RoleRequest(
            @NotBlank(message = "Role is required")
            @Pattern(regexp = "admin|member", message = "Role must be admin or member") String role) {
    }
}

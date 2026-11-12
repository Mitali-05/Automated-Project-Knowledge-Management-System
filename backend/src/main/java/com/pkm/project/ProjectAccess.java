package com.pkm.project;

import com.pkm.common.ApiException;
import org.springframework.stereotype.Component;

/**
 * Central access rules. A project that the caller is not a member of is reported as "not found" (404, not 403),
 * mirroring GitHub private repositories: outsiders cannot even learn that the project exists.
 */
@Component
public class ProjectAccess {

    private final ProjectMemberRepository memberRepository;

    public ProjectAccess(ProjectMemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    public ProjectMember requireMember(Long projectId, Long userId) {
        return memberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> ApiException.notFound("Project not found"));
    }

    public ProjectMember requireOwner(Long projectId, Long userId) {
        ProjectMember member = requireMember(projectId, userId);
        if (member.getRole() != ProjectMember.Role.owner) {
            throw ApiException.forbidden("Only project owners can do this");
        }
        return member;
    }
}

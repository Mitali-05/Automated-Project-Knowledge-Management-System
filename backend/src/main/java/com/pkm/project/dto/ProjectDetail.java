package com.pkm.project.dto;

import java.util.List;

public record ProjectDetail(ProjectSummary project, List<RepositoryDto> repositories, List<MemberDto> members) {
}

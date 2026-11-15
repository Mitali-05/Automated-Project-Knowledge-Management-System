package com.pkm.freshness;

import com.pkm.common.CurrentUser;
import com.pkm.freshness.FreshnessDtos.AffectedKnowledgeDto;
import com.pkm.freshness.FreshnessDtos.FreshnessOverviewDto;
import com.pkm.freshness.FreshnessDtos.KnowledgeFreshnessDetailDto;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}")
public class FreshnessController {

    private final FreshnessService freshnessService;

    public FreshnessController(FreshnessService freshnessService) {
        this.freshnessService = freshnessService;
    }

    @GetMapping("/freshness")
    public FreshnessOverviewDto overview(
            @PathVariable Long projectId,
            @AuthenticationPrincipal CurrentUser user) {
        return freshnessService.getOverview(projectId, user.id());
    }

    @GetMapping("/freshness/affected")
    public List<AffectedKnowledgeDto> affected(
            @PathVariable Long projectId,
            @AuthenticationPrincipal CurrentUser user) {
        return freshnessService.getAffected(projectId, user.id());
    }

    @GetMapping("/knowledge/{knowledgeId}/freshness")
    public KnowledgeFreshnessDetailDto detail(
            @PathVariable Long projectId,
            @PathVariable Long knowledgeId,
            @AuthenticationPrincipal CurrentUser user) {
        return freshnessService.getDetail(projectId, knowledgeId, user.id());
    }

    @PostMapping("/freshness/recheck")
    public FreshnessOverviewDto recheck(
            @PathVariable Long projectId,
            @AuthenticationPrincipal CurrentUser user) {
        return freshnessService.recheckProject(projectId, user.id());
    }

    @PostMapping("/knowledge/{knowledgeId}/revalidate")
    public KnowledgeFreshnessDetailDto revalidate(
            @PathVariable Long projectId,
            @PathVariable Long knowledgeId,
            @AuthenticationPrincipal CurrentUser user) {
        return freshnessService.revalidateItem(projectId, knowledgeId, user.id());
    }
}

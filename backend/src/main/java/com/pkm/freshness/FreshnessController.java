package com.pkm.freshness;

import com.pkm.common.CurrentUser;
import com.pkm.freshness.FreshnessDtos.AffectedKnowledgeDto;
import com.pkm.freshness.FreshnessDtos.FreshnessOverviewDto;
import com.pkm.freshness.FreshnessDtos.KnowledgeFreshnessDetailDto;
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
            @PathVariable Long projectId) {
        return freshnessService.getOverview(projectId, CurrentUser.id());
    }

    @GetMapping("/freshness/affected")
    public List<AffectedKnowledgeDto> affected(
            @PathVariable Long projectId) {
        return freshnessService.getAffected(projectId, CurrentUser.id());
    }

    @GetMapping("/knowledge/{knowledgeId}/freshness")
    public KnowledgeFreshnessDetailDto detail(
            @PathVariable Long projectId,
            @PathVariable Long knowledgeId) {
        return freshnessService.getDetail(projectId, knowledgeId, CurrentUser.id());
    }

    @PostMapping("/freshness/recheck")
    public FreshnessOverviewDto recheck(
            @PathVariable Long projectId) {
        return freshnessService.recheckProject(projectId, CurrentUser.id());
    }

    @PostMapping("/knowledge/{knowledgeId}/revalidate")
    public KnowledgeFreshnessDetailDto revalidate(
            @PathVariable Long projectId,
            @PathVariable Long knowledgeId) {
        return freshnessService.revalidateItem(projectId, knowledgeId, CurrentUser.id());
    }
}

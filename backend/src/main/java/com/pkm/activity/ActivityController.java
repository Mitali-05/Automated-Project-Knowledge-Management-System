package com.pkm.activity;

import com.pkm.common.CurrentUser;
import com.pkm.common.PageResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}/activity")
public class ActivityController {

    private final ActivityService service;

    public ActivityController(ActivityService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<ActivityDto> history(@PathVariable Long projectId,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return service.history(projectId, CurrentUser.id(), page, size);
    }
}

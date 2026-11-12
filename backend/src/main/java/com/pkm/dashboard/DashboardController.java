package com.pkm.dashboard;

import com.pkm.common.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping
    public DashboardDto dashboard(@org.springframework.web.bind.annotation.RequestParam(required = false) Long orgId) {
        return service.forUser(CurrentUser.id(), orgId);
    }
}

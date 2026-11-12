package com.pkm.knowledge;

import com.pkm.common.CurrentUser;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/knowledge")
public class KnowledgeController {

    private final KnowledgeService service;

    public KnowledgeController(KnowledgeService service) {
        this.service = service;
    }

    @GetMapping
    public List<KnowledgeDto> list(@PathVariable Long projectId) {
        return service.list(projectId, CurrentUser.id());
    }

    @GetMapping("/{itemId}")
    public KnowledgeDto get(@PathVariable Long projectId, @PathVariable Long itemId) {
        return service.get(projectId, itemId, CurrentUser.id());
    }
}

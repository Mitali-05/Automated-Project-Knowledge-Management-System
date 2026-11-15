package com.pkm.assistant;

import com.pkm.assistant.AssistantDtos.*;
import com.pkm.common.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/assistant")
public class AssistantController {

    private final AssistantService assistantService;

    public AssistantController(AssistantService assistantService) {
        this.assistantService = assistantService;
    }

    @PostMapping("/chat")
    public ChatResponse chat(
            @PathVariable Long projectId,
            @AuthenticationPrincipal CurrentUser user,
            @Valid @RequestBody ChatRequest request) {
        return assistantService.chat(projectId, user.id(), request);
    }

    @GetMapping("/conversations")
    public List<ChatConversationDto> listConversations(
            @PathVariable Long projectId,
            @AuthenticationPrincipal CurrentUser user) {
        return assistantService.listConversations(projectId, user.id());
    }

    @GetMapping("/conversations/{conversationId}")
    public List<ChatMessageDto> getConversationMessages(
            @PathVariable Long projectId,
            @PathVariable Long conversationId,
            @AuthenticationPrincipal CurrentUser user) {
        return assistantService.getConversationMessages(projectId, conversationId, user.id());
    }

    @PatchMapping("/conversations/{conversationId}")
    public ChatConversationDto renameConversation(
            @PathVariable Long projectId,
            @PathVariable Long conversationId,
            @AuthenticationPrincipal CurrentUser user,
            @Valid @RequestBody RenameConversationRequest request) {
        return assistantService.renameConversation(projectId, conversationId, user.id(), request.title());
    }

    @DeleteMapping("/conversations/{conversationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteConversation(
            @PathVariable Long projectId,
            @PathVariable Long conversationId,
            @AuthenticationPrincipal CurrentUser user) {
        assistantService.deleteConversation(projectId, conversationId, user.id());
    }
}

package com.pkm.assistant;

import com.pkm.assistant.AssistantDtos.*;
import com.pkm.common.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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
            @Valid @RequestBody ChatRequest request) {
        return assistantService.chat(projectId, CurrentUser.id(), request);
    }

    @GetMapping("/conversations")
    public List<ChatConversationDto> listConversations(
            @PathVariable Long projectId) {
        return assistantService.listConversations(projectId, CurrentUser.id());
    }

    @PostMapping("/conversations")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatConversationDto createConversation(
            @PathVariable Long projectId) {
        return assistantService.createConversation(projectId, CurrentUser.id(), "New Chat");
    }

    @GetMapping("/conversations/{conversationId}")
    public List<ChatMessageDto> getConversationMessages(
            @PathVariable Long projectId,
            @PathVariable Long conversationId) {
        return assistantService.getConversationMessages(projectId, conversationId, CurrentUser.id());
    }

    @PatchMapping("/conversations/{conversationId}")
    public ChatConversationDto renameConversation(
            @PathVariable Long projectId,
            @PathVariable Long conversationId,
            @Valid @RequestBody RenameConversationRequest request) {
        return assistantService.renameConversation(projectId, conversationId, CurrentUser.id(), request.title());
    }

    @DeleteMapping("/conversations/{conversationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteConversation(
            @PathVariable Long projectId,
            @PathVariable Long conversationId) {
        assistantService.deleteConversation(projectId, conversationId, CurrentUser.id());
    }
}

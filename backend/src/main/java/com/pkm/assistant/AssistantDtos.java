package com.pkm.assistant;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;

public class AssistantDtos {

    public record ChatRequest(
            @NotBlank String message,
            Long conversationId
    ) {}

    public record RenameConversationRequest(
            @NotBlank String title
    ) {}

    public record CitationDto(
            int index,
            Long knowledgeId,
            String title,
            String module,
            String repositoryName,
            String sourceFile,
            String evidenceType,
            String excerpt,
            String commitSha,
            String url,
            String changeStatus
    ) {}

    public record ChatMessageDto(
            Long id,
            String role,
            String content,
            List<CitationDto> citations,
            String freshnessWarning,
            Instant createdAt
    ) {}

    public record ChatConversationDto(
            Long id,
            String title,
            Instant createdAt,
            Instant updatedAt,
            String lastMessage,
            int messageCount
    ) {}

    public record ChatResponse(
            Long conversationId,
            String message,
            List<CitationDto> citations,
            String freshnessWarning
    ) {}
}

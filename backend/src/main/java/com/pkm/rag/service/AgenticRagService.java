package com.pkm.rag.service;

import com.pkm.rag.dto.KnowledgeItem;
import com.pkm.rag.dto.KnowledgeItemsResponse;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class AgenticRagService {

    private final ChatClient chatClient;

    public AgenticRagService(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    public List<KnowledgeItem> extractKnowledge(String evidenceContext) {
        if (evidenceContext == null || evidenceContext.isBlank()) {
            return Collections.emptyList();
        }

        String systemPromptText = """
                You are a software-architecture knowledge extraction engine.
                Analyze ONLY the supplied evidence. Never invent facts. Ignore trivial activity such as typo/formatting-only changes or minor dependency updates with no explanation.
                
                Extract supported knowledge of these types:
                TECHNICAL_DECISION, MODULE_RESPONSIBILITY, IMPLEMENTATION_DETAIL,
                CONFIGURATION, PROBLEM_RESOLUTION, DEPENDENCY.
                
                REPOSITORY HANDLING INSTRUCTIONS:
                1. TECHNICAL_DECISION items require explicit rationale stated in a commit message,
                   PR description, review comment, or code comment.
                2. MODULE_RESPONSIBILITY items should be derived directly from source file structure
                   and file contents showing what a file/module actually does.
                3. IF THERE ARE 0 PRS OR FEW COMMITS: Prioritize extracting MODULE_RESPONSIBILITY and
                   CONFIGURATION items from the provided SOURCE files.
                
                Every item MUST cite one or more supplied evidence IDs (e.g., SOURCE:path, COMMIT:sha, PR:num)
                that genuinely support it.
                """;

        KnowledgeItemsResponse extracted = chatClient.prompt()
                .system(systemPromptText)
                .user("Extract knowledge from this evidence:\n\n" + evidenceContext)
                .call()
                .entity(KnowledgeItemsResponse.class);

        return extracted != null && extracted.knowledgeItems() != null
                ? extracted.knowledgeItems()
                : Collections.emptyList();
    }
}

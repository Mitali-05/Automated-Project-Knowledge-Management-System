package com.pkm.assistant;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkm.assistant.AssistantDtos.ChatRequest;
import com.pkm.assistant.AssistantDtos.ChatResponse;
import com.pkm.freshness.KnowledgeFreshness;
import com.pkm.freshness.KnowledgeFreshnessRepository;
import com.pkm.knowledge.KnowledgeEvidence;
import com.pkm.knowledge.KnowledgeItem;
import com.pkm.knowledge.KnowledgeItemRepository;
import com.pkm.project.Project;
import com.pkm.project.ProjectAccess;
import com.pkm.project.ProjectRepository;
import com.pkm.project.ProjectRepositoryLink;
import com.pkm.user.User;
import com.pkm.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssistantServiceTest {

    @Mock
    private GeminiClient geminiClient;
    @Mock
    private ChatConversationRepository conversationRepository;
    @Mock
    private ChatMessageRepository messageRepository;
    @Mock
    private KnowledgeItemRepository knowledgeRepository;
    @Mock
    private KnowledgeFreshnessRepository freshnessRepository;
    @Mock
    private KnowledgeVectorRepository vectorRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProjectAccess access;

    private AssistantService service;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        service = new AssistantService(
                geminiClient,
                conversationRepository,
                messageRepository,
                knowledgeRepository,
                freshnessRepository,
                vectorRepository,
                projectRepository,
                userRepository,
                access,
                objectMapper
        );
    }

    @Test
    void testChat_WhenNoKnowledgeItems_ReturnsInsufficientEvidence() {
        Long projectId = 1L;
        Long userId = 2L;

        Project project = new Project();
        project.setId(projectId);
        project.setName("PRISM Test");

        User user = new User();
        user.setId(userId);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(conversationRepository.save(any(ChatConversation.class))).thenAnswer(inv -> {
            ChatConversation c = inv.getArgument(0);
            c.setId(99L);
            return c;
        });
        when(knowledgeRepository.findAllWithEvidence(projectId)).thenReturn(List.of());

        ChatResponse response = service.chat(projectId, userId, new ChatRequest("Explain architecture", null));

        assertNotNull(response);
        assertEquals(99L, response.conversationId());
        assertTrue(response.message().contains("I couldn't find sufficient evidence"));
        assertTrue(response.citations().isEmpty());
        assertNull(response.freshnessWarning());
    }

    @Test
    void testChat_WithKnowledgeItems_InvokesGeminiAndAttachesCitations() {
        Long projectId = 1L;
        Long userId = 2L;

        Project project = new Project();
        project.setId(projectId);
        project.setName("PRISM Test");

        User user = new User();
        user.setId(userId);

        ProjectRepositoryLink repo = new ProjectRepositoryLink();
        repo.setRepoOwner("acme");
        repo.setRepoName("core-api");

        KnowledgeItem item = new KnowledgeItem();
        item.setId(50L);
        item.setProject(project);
        item.setRepository(repo);
        item.setTitle("Authentication Architecture");
        item.setKnowledgeType("Decision");
        item.setSummary("PRISM uses stateless JWT authentication with refresh rotation.");
        item.setModule("Auth");

        KnowledgeEvidence ev = new KnowledgeEvidence();
        ev.setId(10L);
        ev.setItem(item);
        ev.setSourceType("FILE");
        ev.setSourceRef("src/AuthService.java");
        ev.setUrl("https://github.com/acme/core-api/blob/main/src/AuthService.java");
        item.setEvidence(new ArrayList<>(List.of(ev)));

        KnowledgeFreshness freshness = new KnowledgeFreshness();
        freshness.setKnowledgeItem(item);
        freshness.setChangeStatus("POTENTIALLY_STALE");
        freshness.setChangedFiles("src/AuthService.java");
        freshness.setReason("AuthService.java modified in commit f12345");

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(conversationRepository.save(any(ChatConversation.class))).thenAnswer(inv -> {
            ChatConversation c = inv.getArgument(0);
            c.setId(100L);
            return c;
        });
        when(knowledgeRepository.findAllWithEvidence(projectId)).thenReturn(List.of(item));
        when(freshnessRepository.findByProjectId(projectId)).thenReturn(List.of(freshness));
        when(geminiClient.generateResponse(any(), any(), any()))
                .thenReturn("Authentication is managed via stateless JWT tokens [1]. Note that the supporting source was recently updated.");

        ChatResponse response = service.chat(projectId, userId, new ChatRequest("How does auth work?", null));

        assertNotNull(response);
        assertEquals(100L, response.conversationId());
        assertTrue(response.message().contains("stateless JWT tokens [1]"));
        assertEquals(1, response.citations().size());
        assertEquals("Authentication Architecture", response.citations().get(0).title());
        assertEquals("POTENTIALLY_STALE", response.citations().get(0).changeStatus());
        assertNotNull(response.freshnessWarning());
        assertTrue(response.freshnessWarning().contains("potentially stale"));
    }
}

package com.pkm.assistant;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkm.assistant.AssistantDtos.*;
import com.pkm.common.ApiException;
import com.pkm.freshness.KnowledgeFreshness;
import com.pkm.freshness.KnowledgeFreshnessRepository;
import com.pkm.knowledge.KnowledgeEvidence;
import com.pkm.knowledge.KnowledgeItem;
import com.pkm.knowledge.KnowledgeItemRepository;
import com.pkm.project.Project;
import com.pkm.project.ProjectAccess;
import com.pkm.project.ProjectRepository;
import com.pkm.user.User;
import com.pkm.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Transactional
public class AssistantService {

    private static final Logger log = LoggerFactory.getLogger(AssistantService.class);
    private static final Pattern CITATION_PATTERN = Pattern.compile("\\[(?:Citation\\s*)?(\\d+)\\]");

    private final GeminiClient geminiClient;
    private final ChatConversationRepository conversationRepository;
    private final ChatMessageRepository messageRepository;
    private final KnowledgeItemRepository knowledgeRepository;
    private final KnowledgeFreshnessRepository freshnessRepository;
    private final KnowledgeVectorRepository vectorRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectAccess access;
    private final ObjectMapper objectMapper;

    public AssistantService(
            GeminiClient geminiClient,
            ChatConversationRepository conversationRepository,
            ChatMessageRepository messageRepository,
            KnowledgeItemRepository knowledgeRepository,
            KnowledgeFreshnessRepository freshnessRepository,
            KnowledgeVectorRepository vectorRepository,
            ProjectRepository projectRepository,
            UserRepository userRepository,
            ProjectAccess access,
            ObjectMapper objectMapper) {
        this.geminiClient = geminiClient;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.knowledgeRepository = knowledgeRepository;
        this.freshnessRepository = freshnessRepository;
        this.vectorRepository = vectorRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.access = access;
        this.objectMapper = objectMapper;
    }

    public ChatResponse chat(Long projectId, Long userId, ChatRequest request) {
        access.requireMember(projectId, userId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> ApiException.notFound("Project not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));

        ChatConversation conversation;
        List<Map<String, String>> history = new ArrayList<>();
        if (request.conversationId() != null) {
            conversation = conversationRepository.findOneWithMessages(request.conversationId(), projectId, userId)
                    .orElseThrow(() -> ApiException.notFound("Conversation not found"));
            if (conversation.getMessages() != null && !conversation.getMessages().isEmpty()) {
                List<ChatMessage> existing = conversation.getMessages();
                int startIdx = Math.max(0, existing.size() - 8);
                for (int i = startIdx; i < existing.size(); i++) {
                    ChatMessage m = existing.get(i);
                    if (m.getContent() != null && !m.getContent().isBlank()) {
                        history.add(Map.of(
                                "role", m.getRole(),
                                "text", m.getContent()
                        ));
                    }
                }
            }
        } else {
            conversation = new ChatConversation();
            conversation.setProject(project);
            conversation.setUser(user);
            String title = request.message().trim();
            if (title.length() > 60) {
                title = title.substring(0, 57) + "...";
            }
            conversation.setTitle(title);
            conversation = conversationRepository.save(conversation);
        }

        ChatMessage userMsg = new ChatMessage();
        userMsg.setConversation(conversation);
        userMsg.setRole("user");
        userMsg.setContent(request.message().trim());
        messageRepository.save(userMsg);

        List<KnowledgeItem> allItems = knowledgeRepository.findAllWithEvidence(projectId);

        Map<Long, KnowledgeFreshness> freshnessMap = freshnessRepository.findByProjectId(projectId).stream()
                .collect(Collectors.toMap(f -> f.getKnowledgeItem().getId(), f -> f, (a, b) -> a));

        List<CitationCandidate> candidates = new ArrayList<>();
        if (!allItems.isEmpty()) {
            List<KnowledgeItem> selectedItems;
            if (isDeepAnalysisQuery(request.message())) {
                selectedItems = selectBroadKnowledgeBase(allItems, 25);
            } else {
                List<ScoredItem> ranked = rankKnowledgeItems(request.message(), allItems, projectId);
                selectedItems = ranked.stream().limit(10).map(s -> s.item).toList();
            }

            int index = 1;
            for (KnowledgeItem k : selectedItems) {
                KnowledgeFreshness f = freshnessMap.get(k.getId());
                KnowledgeEvidence primaryEvidence = k.getEvidence().isEmpty() ? null : k.getEvidence().get(0);

                String repoName = k.getRepository() != null
                        ? k.getRepository().getRepoOwner() + "/" + k.getRepository().getRepoName()
                        : "Repository";

                String sourceFile = primaryEvidence != null ? primaryEvidence.getSourceRef() : null;
                String url = primaryEvidence != null ? primaryEvidence.getUrl() : null;
                String excerpt = primaryEvidence != null ? primaryEvidence.getExcerpt() : null;
                String evidenceType = primaryEvidence != null ? primaryEvidence.getSourceType() : "FILE";
                String changeStatus = f != null ? f.getChangeStatus() : "CURRENT";
                String affectedCommit = f != null ? f.getAffectedCommit() : null;

                CitationDto citation = new CitationDto(
                        index,
                        k.getId(),
                        k.getTitle(),
                        k.getModule(),
                        repoName,
                        sourceFile,
                        evidenceType,
                        excerpt,
                        affectedCommit,
                        url,
                        changeStatus
                );
                candidates.add(new CitationCandidate(index, k, f, citation));
                index++;
            }
        }

        String systemPrompt = buildSystemPrompt(project.getName(), candidates, allItems.isEmpty());
        String assistantAnswer = null;
        try {
            if (geminiClient != null) {
                assistantAnswer = geminiClient.generateResponse(systemPrompt, history, request.message());
            }
        } catch (Exception e) {
            log.warn("Gemini generation failed: {}", e.getMessage());
        }

        if (assistantAnswer == null || assistantAnswer.isBlank()) {
            assistantAnswer = allItems.isEmpty()
                    ? "I couldn't find sufficient evidence in this project's indexed knowledge to answer that confidently. Please link a repository and run knowledge extraction first."
                    : "I am unable to generate a response at this moment. Please try again.";
        }

        List<CitationDto> citedList = resolveCitedReferences(assistantAnswer, candidates);

        List<String> warnings = new ArrayList<>();
        for (CitationDto c : citedList) {
            if ("POTENTIALLY_STALE".equalsIgnoreCase(c.changeStatus()) || "OUTDATED".equalsIgnoreCase(c.changeStatus())) {
                warnings.add(String.format("Knowledge item '%s' is %s due to recent repository file changes.",
                        c.title(), c.changeStatus().toLowerCase().replace('_', ' ')));
            }
        }
        String combinedWarning = warnings.isEmpty() ? null : String.join(" ", warnings);

        String citationsJson = null;
        try {
            citationsJson = objectMapper.writeValueAsString(citedList);
        } catch (Exception e) {
            log.warn("Failed to serialize citations: {}", e.getMessage());
        }

        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setConversation(conversation);
        assistantMsg.setRole("assistant");
        assistantMsg.setContent(assistantAnswer);
        assistantMsg.setCitationsJson(citationsJson);
        assistantMsg.setFreshnessWarning(combinedWarning);
        messageRepository.save(assistantMsg);

        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);

        return new ChatResponse(conversation.getId(), assistantAnswer, citedList, combinedWarning);
    }

    public ChatConversationDto renameConversation(Long projectId, Long conversationId, Long userId, String newTitle) {
        access.requireMember(projectId, userId);
        ChatConversation conversation = conversationRepository.findOneWithMessages(conversationId, projectId, userId)
                .orElseThrow(() -> ApiException.notFound("Conversation not found"));
        String sanitized = newTitle.trim();
        if (sanitized.length() > 60) {
            sanitized = sanitized.substring(0, 57) + "...";
        }
        conversation.setTitle(sanitized);
        conversation.setUpdatedAt(Instant.now());
        ChatConversation saved = conversationRepository.save(conversation);
        String lastMessage = saved.getMessages().isEmpty() ? ""
                : saved.getMessages().get(saved.getMessages().size() - 1).getContent();
        return new ChatConversationDto(
                saved.getId(),
                saved.getTitle(),
                saved.getCreatedAt(),
                saved.getUpdatedAt(),
                lastMessage,
                saved.getMessages().size()
        );
    }

    public List<ChatConversationDto> listConversations(Long projectId, Long userId) {
        access.requireMember(projectId, userId);
        return conversationRepository.findByProjectAndUser(projectId, userId).stream()
                .map(c -> {
                    String lastMessage = c.getMessages().isEmpty() ? ""
                            : c.getMessages().get(c.getMessages().size() - 1).getContent();
                    return new ChatConversationDto(
                            c.getId(),
                            c.getTitle(),
                            c.getCreatedAt(),
                            c.getUpdatedAt(),
                            lastMessage,
                            c.getMessages().size()
                    );
                })
                .toList();
    }

    public List<ChatMessageDto> getConversationMessages(Long projectId, Long conversationId, Long userId) {
        access.requireMember(projectId, userId);
        ChatConversation conversation = conversationRepository.findOneWithMessages(conversationId, projectId, userId)
                .orElseThrow(() -> ApiException.notFound("Conversation not found"));

        return conversation.getMessages().stream()
                .map(m -> {
                    List<CitationDto> citations = Collections.emptyList();
                    if (m.getCitationsJson() != null && !m.getCitationsJson().isBlank()) {
                        try {
                            citations = objectMapper.readValue(m.getCitationsJson(), new TypeReference<>() {});
                        } catch (Exception e) {
                            log.warn("Could not deserialize citations: {}", e.getMessage());
                        }
                    }
                    return new ChatMessageDto(
                            m.getId(),
                            m.getRole(),
                            m.getContent(),
                            citations,
                            m.getFreshnessWarning(),
                            m.getCreatedAt()
                    );
                })
                .toList();
    }

    public void deleteConversation(Long projectId, Long conversationId, Long userId) {
        access.requireMember(projectId, userId);
        conversationRepository.deleteByIdAndProjectIdAndUserId(conversationId, projectId, userId);
    }

    private boolean isDeepAnalysisQuery(String query) {
        if (query == null) return false;
        String q = query.toLowerCase();
        return q.contains("analyse this entire project") || q.contains("analyze this entire project")
                || q.contains("entire project") || q.contains("technical overview")
                || q.contains("architecture review") || q.contains("deep project analysis")
                || q.contains("full project analysis") || q.contains("complete architecture");
    }

    private List<KnowledgeItem> selectBroadKnowledgeBase(List<KnowledgeItem> items, int limit) {
        Map<String, List<KnowledgeItem>> byModule = new LinkedHashMap<>();
        for (KnowledgeItem item : items) {
            String mod = item.getModule() != null ? item.getModule() : "General";
            byModule.computeIfAbsent(mod, k -> new ArrayList<>()).add(item);
        }

        List<KnowledgeItem> selected = new ArrayList<>();
        int round = 0;
        boolean added = true;
        while (selected.size() < limit && added) {
            added = false;
            for (List<KnowledgeItem> list : byModule.values()) {
                if (round < list.size() && selected.size() < limit) {
                    selected.add(list.get(round));
                    added = true;
                }
            }
            round++;
        }
        return selected;
    }

    private List<ScoredItem> rankKnowledgeItems(String query, List<KnowledgeItem> items, Long projectId) {
        String[] queryTokens = query.toLowerCase().split("\\s+");
        Set<String> keywords = Arrays.stream(queryTokens)
                .filter(t -> t.length() > 2)
                .collect(Collectors.toSet());

        List<ScoredItem> scored = new ArrayList<>();
        for (KnowledgeItem item : items) {
            double score = 0.0;
            String text = ((item.getTitle() != null ? item.getTitle() : "") + " "
                    + (item.getModule() != null ? item.getModule() : "") + " "
                    + (item.getSummary() != null ? item.getSummary() : "") + " "
                    + (item.getDetails() != null ? item.getDetails() : "")).toLowerCase();

            for (String kw : keywords) {
                if (text.contains(kw)) {
                    score += 1.0;
                    if (item.getTitle() != null && item.getTitle().toLowerCase().contains(kw)) {
                        score += 2.0;
                    }
                    if (item.getModule() != null && item.getModule().toLowerCase().contains(kw)) {
                        score += 1.5;
                    }
                }
            }

            for (KnowledgeEvidence ev : item.getEvidence()) {
                String ref = (ev.getSourceRef() != null ? ev.getSourceRef() : "").toLowerCase();
                String exc = (ev.getExcerpt() != null ? ev.getExcerpt() : "").toLowerCase();
                for (String kw : keywords) {
                    if (ref.contains(kw)) score += 1.5;
                    if (exc.contains(kw)) score += 0.8;
                }
            }

            if (item.getConfidence() != null) {
                score += item.getConfidence() * 0.5;
            }

            scored.add(new ScoredItem(item, score));
        }

        scored.sort((a, b) -> Double.compare(b.score, a.score));
        return scored;
    }

    private String buildSystemPrompt(String projectName, List<CitationCandidate> candidates, boolean noIndexedKnowledge) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are PRISM, an autonomous enterprise AI architect, principal software engineer, and project intelligence assistant.\n");
        sb.append("You are embedded in the project '").append(projectName).append("'.\n\n");
        sb.append("You operate across three distinct intelligence modes based on the user's intent:\n\n");

        sb.append("MODE A — PROJECT INTELLIGENCE:\n");
        sb.append("When the user asks questions regarding the current project '").append(projectName).append("' (architecture, features, authentication, code structure, data flow, dependencies, modules, freshness, or files):\n");
        sb.append("1. Answer using the verified Project Knowledge Sources provided below.\n");
        sb.append("2. When making ANY factual statement regarding the project, cite the exact source number using square brackets, e.g. [1], [2].\n");
        sb.append("3. Detail real module names, source files, and implementation realities from the evidence.\n");
        sb.append("4. If a source is flagged as POTENTIALLY_STALE or OUTDATED, explicitly highlight that recent repository commits modified the underlying files.\n");
        sb.append("5. If the user asks for a comprehensive project analysis ('Analyse this entire project', 'Architecture review', 'Technical overview'), provide a comprehensive, structured technical breakdown covering:\n");
        sb.append("   - Executive Summary & Project Purpose\n");
        sb.append("   - Technology Stack & Core Dependencies\n");
        sb.append("   - Architectural Style & Module Breakdown\n");
        sb.append("   - Core Domain Entities & Relationships\n");
        sb.append("   - Key Execution Workflows (Auth, Sync, Ingestion, API)\n");
        sb.append("   - Security, Authentication & Permissions Posture\n");
        sb.append("   - Data Storage & Persistence Patterns\n");
        sb.append("   - Drift & Freshness Status of Project Knowledge\n");
        sb.append("   - Potential Risks, Gaps, or Technical Debt\n");
        sb.append("   - Concrete Recommendations for Improvement\n\n");

        sb.append("MODE B — GENERAL SOFTWARE ENGINEERING INTELLIGENCE:\n");
        sb.append("When the user asks general technical, programming, software architecture, DevOps, testing, career, or conceptual questions that are not specific to this project (e.g. 'What is the difference between REST and GraphQL?', 'How do I write unit tests in Go?', 'Explain Raft consensus', 'Best practices for Dockerfiles'):\n");
        sb.append("1. Answer comprehensively, clearly, and authoritatively using your deep software engineering knowledge.\n");
        sb.append("2. NEVER state 'I couldn't find sufficient evidence in this project's indexed knowledge to answer that confidently.'\n");
        sb.append("3. DO NOT invent or attach fake project citations. Citations [1], [2] must ONLY be used when referencing the provided project sources.\n");
        sb.append("4. Format with clean markdown headers, code blocks with syntax highlighting, bullet points, and tables where beneficial.\n\n");

        sb.append("MODE C — HYBRID SYNTHESIS:\n");
        sb.append("When the user asks a question requiring both project reality and general software engineering analysis (e.g. 'How much time would a junior developer require to understand this project?', 'What improvements would you recommend for this architecture?', 'Evaluate this project's security posture'):\n");
        sb.append("1. Ground the current state strictly in the project's real modules, tech stack, and evidence, citing the verified sources [1], [2].\n");
        sb.append("2. Apply industry software engineering principles, realistic onboarding timelines, or architectural patterns to synthesize the answer.\n");
        sb.append("3. Clearly distinguish between verified project facts (with citations) and your professional engineering estimation or recommendations.\n\n");

        if (noIndexedKnowledge) {
            sb.append("NOTICE: No repository knowledge items have been indexed yet for this project. If the user asks general engineering questions, answer them thoroughly. If they ask about this project's implementation, politely explain that no repository has completed extraction yet, and suggest linking a repo and clicking 'Sync now'.\n\n");
        } else {
            sb.append("--- PROJECT KNOWLEDGE SOURCES ---\n\n");
            for (CitationCandidate cand : candidates) {
                sb.append("[").append(cand.index).append("] Title: ").append(cand.item.getTitle()).append("\n");
                if (cand.item.getModule() != null) {
                    sb.append("Module: ").append(cand.item.getModule()).append("\n");
                }
                sb.append("Type: ").append(cand.item.getKnowledgeType()).append("\n");

                if (cand.freshness != null) {
                    sb.append("Change Freshness: ").append(cand.freshness.getChangeStatus()).append("\n");
                    if (cand.freshness.getChangedFiles() != null) {
                        sb.append("AFFECTED BY CHANGES IN: ").append(cand.freshness.getChangedFiles()).append("\n");
                    }
                    if (cand.freshness.getReason() != null) {
                        sb.append("Freshness Reason: ").append(cand.freshness.getReason()).append("\n");
                    }
                }

                sb.append("Summary: ").append(cand.item.getSummary()).append("\n");
                if (cand.item.getDetails() != null && !cand.item.getDetails().isBlank()) {
                    sb.append("Details: ").append(cand.item.getDetails()).append("\n");
                }

                if (!cand.item.getEvidence().isEmpty()) {
                    sb.append("Evidence Pointers:\n");
                    for (KnowledgeEvidence ev : cand.item.getEvidence()) {
                        sb.append("  - Ref: ").append(ev.getSourceRef());
                        if (ev.getUrl() != null) sb.append(" | URL: ").append(ev.getUrl());
                        if (ev.getExcerpt() != null) sb.append("\n    Excerpt: ").append(ev.getExcerpt());
                        sb.append("\n");
                    }
                }
                sb.append("\n");
            }
        }

        return sb.toString();
    }

    private List<CitationDto> resolveCitedReferences(String answer, List<CitationCandidate> candidates) {
        if (candidates.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Integer, CitationDto> map = candidates.stream()
                .collect(Collectors.toMap(c -> c.index, c -> c.dto));

        Set<Integer> citedIndices = new LinkedHashSet<>();
        Matcher matcher = CITATION_PATTERN.matcher(answer);
        while (matcher.find()) {
            try {
                int idx = Integer.parseInt(matcher.group(1));
                if (map.containsKey(idx)) {
                    citedIndices.add(idx);
                }
            } catch (NumberFormatException ignored) {}
        }

        if (citedIndices.isEmpty()) {
            return Collections.emptyList();
        }

        return citedIndices.stream().map(map::get).toList();
    }

    private record ScoredItem(KnowledgeItem item, double score) {}
    private record CitationCandidate(int index, KnowledgeItem item, KnowledgeFreshness freshness, CitationDto dto) {}
}

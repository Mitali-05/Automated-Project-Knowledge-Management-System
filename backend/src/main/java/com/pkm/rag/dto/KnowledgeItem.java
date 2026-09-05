package com.pkm.rag.dto;

import java.util.List;

public record KnowledgeItem(
    String title,
    String knowledgeType,
    String summary,
    String details,
    String module,
    Double confidence,
    List<String> evidenceIds
) {}

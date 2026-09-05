package com.pkm.rag.dto;

import java.util.List;

public record KnowledgeItemsResponse(
    List<KnowledgeItem> knowledgeItems
) {}

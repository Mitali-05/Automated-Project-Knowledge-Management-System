package com.pkm.project.dto;

public record DashboardStats(
    long totalProjects,
    long totalRepositories,
    long documentsGenerated,
    java.util.List<java.util.Map<String, Object>> knowledgeDistribution,
    java.util.List<java.util.Map<String, Object>> knowledgeGrowth
) {}

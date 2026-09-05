package com.pkm.project;

import com.pkm.project.dto.DashboardStats;
import com.pkm.rag.entity.KnowledgeItemRepository;
import com.pkm.rag.entity.ProjectRepositoryRepo;
import com.pkm.user.User;
import com.pkm.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final KnowledgeItemRepository knowledgeItemRepository;
    private final ProjectRepositoryRepo projectRepositoryRepo;

    public DashboardController(
            ProjectRepository projectRepository,
            UserRepository userRepository,
            KnowledgeItemRepository knowledgeItemRepository,
            ProjectRepositoryRepo projectRepositoryRepo) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.knowledgeItemRepository = knowledgeItemRepository;
        this.projectRepositoryRepo = projectRepositoryRepo;
    }

    private Long currentUserId(Authentication auth) {
        return (Long) auth.getPrincipal();
    }

    @GetMapping("/stats")
    public ResponseEntity<DashboardStats> getStats(Authentication auth) {
        User user = userRepository.findById(currentUserId(auth))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        
        Long orgId = user.getOrganization().getId();
        
        long totalProjects = projectRepository.countByOrganizationId(orgId);
        long totalRepositories = projectRepositoryRepo.countByProjectOrganizationId(orgId);
        long documentsGenerated = knowledgeItemRepository.countByProjectOrganizationId(orgId);
        
        List<Object[]> rawKnowledge = knowledgeItemRepository.getKnowledgeDataForOrg(orgId);

        // Group by type for distribution chart
        Map<String, Long> distributionMap = rawKnowledge.stream()
            .collect(Collectors.groupingBy(
                row -> (String) row[0],
                Collectors.counting()
            ));

        List<Map<String, Object>> distribution = new ArrayList<>();
        distributionMap.forEach((type, count) -> {
            distribution.add(Map.of("name", type, "value", count));
        });

        // Group by date for growth chart
        Map<LocalDate, Long> dateMap = rawKnowledge.stream()
            .collect(Collectors.groupingBy(
                row -> ((LocalDateTime) row[1]).toLocalDate(),
                Collectors.counting()
            ));

        List<Map<String, Object>> growth = new ArrayList<>();
        dateMap.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .forEach(entry -> {
                growth.add(Map.of(
                    "date", entry.getKey().format(DateTimeFormatter.ofPattern("MMM dd")),
                    "items", entry.getValue()
                ));
            });
        
        return ResponseEntity.ok(new DashboardStats(
            totalProjects, 
            totalRepositories, 
            documentsGenerated, 
            distribution, 
            growth
        ));
    }
}

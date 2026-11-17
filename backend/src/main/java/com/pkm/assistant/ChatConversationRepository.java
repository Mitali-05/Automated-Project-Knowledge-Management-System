package com.pkm.assistant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, Long> {

    @Query("select c from ChatConversation c where c.project.id = :projectId and c.user.id = :userId order by c.updatedAt desc")
    List<ChatConversation> findByProjectAndUser(Long projectId, Long userId);

    @Query("select c from ChatConversation c left join fetch c.messages where c.id = :id and c.project.id = :projectId and c.user.id = :userId")
    Optional<ChatConversation> findOneWithMessages(Long id, Long projectId, Long userId);

    void deleteByIdAndProjectIdAndUserId(Long id, Long projectId, Long userId);
}

package com.pkm.notification;

import com.pkm.common.ApiException;
import com.pkm.user.User;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * In-app notifications. The web app polls for them (a bearer token cannot be sent by the browser's EventSource,
 * and putting tokens in URLs is a security smell) - simple, secure and plenty for this use case.
 */
@Service
public class NotificationService {

    private static final int LIMIT = 50;

    private final NotificationRepository repository;

    public NotificationService(NotificationRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void notify(User user, String title, String description) {
        Notification n = new Notification();
        n.setUser(user);
        n.setTitle(title);
        n.setDescription(description);
        repository.save(n);
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> list(Long userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, LIMIT))
                .stream().map(NotificationDto::from).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return repository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markRead(Long notificationId, Long userId) {
        Notification n = repository.findById(notificationId)
                .filter(x -> x.getUser().getId().equals(userId))
                .orElseThrow(() -> ApiException.notFound("Notification not found"));
        n.setRead(true);
    }

    @Transactional
    public void markAllRead(Long userId) {
        repository.markAllRead(userId);
    }
}

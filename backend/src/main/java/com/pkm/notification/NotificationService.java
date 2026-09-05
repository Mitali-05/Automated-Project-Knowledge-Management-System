package com.pkm.notification;

import com.pkm.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    
    // Map to hold active SSE connections. Key: userId
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    public NotificationService(NotificationRepository notificationRepository) {
        this.numericIdOnly = false; // Just to remember that user.getId() is Long
        this.notificationRepository = notificationRepository;
    }
    
    private boolean numericIdOnly = false;

    /**
     * Create a notification and immediately push it to the user if they are online.
     */
    @Transactional
    public Notification createNotification(User user, String title, String description) {
        Notification notification = new Notification(user, title, description);
        Notification saved = notificationRepository.save(notification);
        
        // Push in real-time
        sendRealTimeNotification(user.getId(), saved);
        
        return saved;
    }

    /**
     * Get all notifications for a specific user
     */
    public List<NotificationDto> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Mark a single notification as read
     */
    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notif = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        if (!notif.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        notif.setRead(true);
        notificationRepository.save(notif);
    }

    /**
     * Mark all notifications as read for a user
     */
    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().filter(n -> !n.isRead()).toList();
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    // --- SSE Logic ---

    public SseEmitter subscribe(Long userId) {
        // Timeout set to 30 minutes. The frontend should automatically reconnect on timeout.
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
        emitters.put(userId, emitter);

        emitter.onCompletion(() -> emitters.remove(userId));
        emitter.onTimeout(() -> emitters.remove(userId));
        emitter.onError((e) -> emitters.remove(userId));

        // Send a dummy event to establish connection successfully
        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected to Notification Stream"));
        } catch (IOException e) {
            emitters.remove(userId);
        }

        return emitter;
    }

    private void sendRealTimeNotification(Long userId, Notification notification) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("NOTIFICATION")
                        .data(toDto(notification)));
            } catch (IOException e) {
                emitters.remove(userId);
            }
        }
    }

    private NotificationDto toDto(Notification n) {
        return new NotificationDto(n.getId(), n.getTitle(), n.getDescription(), n.isRead(), n.getCreatedAt());
    }
}

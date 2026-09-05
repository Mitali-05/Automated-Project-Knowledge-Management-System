package com.pkm.notification;

import com.pkm.user.User;
import com.pkm.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationController(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<List<NotificationDto>> getNotifications() {
        User user = getAuthenticatedUser();
        return ResponseEntity.ok(notificationService.getUserNotifications(user.getId()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        User user = getAuthenticatedUser();
        notificationService.markAsRead(id, user.getId());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        User user = getAuthenticatedUser();
        notificationService.markAllAsRead(user.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/stream")
    public SseEmitter streamNotifications() {
        User user = getAuthenticatedUser();
        return notificationService.subscribe(user.getId());
    }

    // Temporary endpoint just to test real-time functionality
    @PostMapping("/test")
    public ResponseEntity<Notification> createTestNotification(@RequestParam String title, @RequestParam String description) {
        User user = getAuthenticatedUser();
        Notification notif = notificationService.createNotification(user, title, description);
        return ResponseEntity.ok(notif);
    }
}

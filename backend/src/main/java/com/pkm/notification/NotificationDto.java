package com.pkm.notification;

import java.time.Instant;

public record NotificationDto(Long id, String title, String description, boolean isRead, Instant createdAt) {

    static NotificationDto from(Notification n) {
        return new NotificationDto(n.getId(), n.getTitle(), n.getDescription(), n.isRead(), n.getCreatedAt());
    }
}

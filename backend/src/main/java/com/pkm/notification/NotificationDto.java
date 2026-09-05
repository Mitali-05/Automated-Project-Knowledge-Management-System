package com.pkm.notification;

import java.time.LocalDateTime;

public record NotificationDto(
    Long id,
    String title,
    String description,
    boolean isRead,
    LocalDateTime createdAt
) {}

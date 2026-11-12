package com.pkm.common;

import java.util.List;

public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {

    /** Slices an already-loaded list. Fine for the data volumes of a single project; swap for DB paging if it grows. */
    public static <T> PageResponse<T> of(List<T> all, int page, int size) {
        int safeSize = Math.max(1, Math.min(size, 100));
        int safePage = Math.max(0, page);
        long total = all.size();
        int totalPages = (int) Math.ceil(total / (double) safeSize);
        int from = (int) Math.min((long) safePage * safeSize, total);
        int to = (int) Math.min(from + (long) safeSize, total);
        return new PageResponse<>(List.copyOf(all.subList(from, to)), safePage, safeSize, total, totalPages);
    }
}

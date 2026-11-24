package com.pkm.common;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record OwnerTransferRequest(@NotNull @Positive Long userId, boolean retainOwnership) {}

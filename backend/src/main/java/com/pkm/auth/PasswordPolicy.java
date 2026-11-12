package com.pkm.auth;

/** Single source of truth for password rules (used by signup and change-password validation). */
public final class PasswordPolicy {

    public static final String REGEX = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$";
    public static final String MESSAGE = "Password must be 8-72 characters and contain at least one letter and one digit";

    private PasswordPolicy() {
    }
}

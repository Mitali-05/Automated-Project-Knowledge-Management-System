package com.pkm.user;

public record UserDto(Long id, String name, String email) {

    public static UserDto from(User u) {
        return new UserDto(u.getId(), u.getName(), u.getEmail());
    }
}

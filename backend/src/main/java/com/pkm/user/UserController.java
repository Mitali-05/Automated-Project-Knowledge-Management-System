package com.pkm.user;

import com.pkm.common.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users/me")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @PutMapping
    public UserDto update(@Valid @RequestBody UpdateProfileRequest request) {
        return service.updateProfile(CurrentUser.id(), request);
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        service.changePassword(CurrentUser.id(), request);
        return ResponseEntity.noContent().build();
    }
}

package com.pkm.auth;

import com.pkm.auth.dto.AuthResponse;
import com.pkm.auth.dto.LoginRequest;
import com.pkm.auth.dto.SignupRequest;
import com.pkm.config.JwtUtil;
import com.pkm.org.Organization;
import com.pkm.org.OrganizationRepository;
import com.pkm.user.User;
import com.pkm.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public AuthResponse signup(SignupRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        // Match-or-create org by name (case-insensitive). This is intentionally
        // lightweight for Phase 0 — no invite codes / domain verification yet.
        Organization org = organizationRepository.findByNameIgnoreCase(req.organizationName())
                .orElseGet(() -> {
                    Organization newOrg = new Organization();
                    newOrg.setName(req.organizationName());
                    return organizationRepository.save(newOrg);
                });

        User user = new User();
        user.setOrganization(org);
        user.setName(req.name());
        user.setEmail(req.email());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(),
                org.getId(), org.getName());
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        Organization org = user.getOrganization();
        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(),
                org.getId(), org.getName());
    }
}

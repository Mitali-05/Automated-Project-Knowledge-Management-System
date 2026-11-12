package com.pkm.auth;

import com.pkm.common.ApiException;
import com.pkm.config.JwtUtil;
import com.pkm.org.OrgService;
import com.pkm.user.User;
import com.pkm.user.UserDto;
import com.pkm.user.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    /** Hash of a throwaway password so that unknown-email logins cost the same as wrong-password ones. */
    private final String dummyHash;

    private final UserRepository userRepository;
    private final OrgService orgService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, OrgService orgService,
                       PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.orgService = orgService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.dummyHash = passwordEncoder.encode("not-a-real-password-1");
    }

    /** Creates the account together with its automatic personal workspace. */
    @Transactional
    public AuthResponse signup(SignupRequest req) {
        String email = normalizeEmail(req.email());
        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("An account with this email already exists");
        }

        User user = new User();
        user.setName(req.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        try {
            user = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw ApiException.conflict("An account with this email already exists");
        }
        orgService.createPersonalWorkspace(user);
        return respond(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        String email = normalizeEmail(req.email());
        User user = userRepository.findByEmail(email).orElse(null);
        String hash = user != null ? user.getPasswordHash() : dummyHash;
        boolean ok = passwordEncoder.matches(req.password(), hash);
        if (user == null || !ok) {
            throw ApiException.unauthorized("Invalid email or password");
        }
        return respond(user);
    }

    private AuthResponse respond(User user) {
        return new AuthResponse(jwtUtil.generateToken(user.getId(), user.getEmail()),
                jwtUtil.expiryFromNow(), UserDto.from(user));
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}

package com.pkm.org;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "organizations")
@Getter
@Setter
@NoArgsConstructor
public class Organization {

    /** PERSONAL = the automatic one-person workspace every user has; TEAM = a shared organization. */
    public enum Type { PERSONAL, TEAM }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Type type = Type.TEAM;

    /** Set only for PERSONAL workspaces: the user it belongs to. */
    @Column(name = "personal_user_id", unique = true)
    private Long personalUserId;

    /** Secret that lets people join a TEAM organization. Null for personal workspaces. */
    @Column(name = "invite_code", unique = true, length = 32)
    private String inviteCode;

    @Column(name = "github_installation_id", unique = true, length = 64)
    private String githubInstallationId;

    @Column(name = "github_installation_verified", nullable = false)
    private boolean githubInstallationVerified = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

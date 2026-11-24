package com.pkm.org;

import com.pkm.common.CurrentUser;
import com.pkm.user.User;
import com.pkm.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orgs")
public class OrganizationController {

    private final OrgService service;
    private final UserRepository users;

    public OrganizationController(OrgService service, UserRepository users) {
        this.service = service;
        this.users = users;
    }

    @GetMapping
    public List<OrgDtos.Summary> list() {
        return service.list(CurrentUser.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrgDtos.Summary create(@Valid @RequestBody OrgDtos.NameRequest request) {
        return service.create(CurrentUser.id(), currentUser(), request.name());
    }

    @PostMapping("/join")
    public OrgDtos.Summary join(@Valid @RequestBody OrgDtos.JoinRequest request) {
        return service.join(CurrentUser.id(), currentUser(), request.inviteCode());
    }

    @GetMapping("/{orgId}")
    public OrgDtos.Detail get(@PathVariable Long orgId) {
        return service.get(orgId, CurrentUser.id());
    }

    @PatchMapping("/{orgId}")
    public OrgDtos.Summary rename(@PathVariable Long orgId, @Valid @RequestBody OrgDtos.NameRequest request) {
        return service.rename(orgId, CurrentUser.id(), request.name());
    }

    @DeleteMapping("/{orgId}")
    public ResponseEntity<Void> delete(@PathVariable Long orgId) {
        service.delete(orgId, CurrentUser.id());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{orgId}/invite-code/rotate")
    public OrgDtos.Summary rotateInviteCode(@PathVariable Long orgId) {
        return service.rotateInviteCode(orgId, CurrentUser.id());
    }

    @PutMapping("/{orgId}/owner")
    public OrgDtos.Detail transferOwnership(@PathVariable Long orgId, @Valid @RequestBody com.pkm.common.OwnerTransferRequest request) {
        service.transferOwnership(orgId, CurrentUser.id(), request.userId(), request.retainOwnership());
        return service.get(orgId, CurrentUser.id());
    }

    @PutMapping("/{orgId}/members/{userId}/role")
    public OrgDtos.Member setRole(@PathVariable Long orgId, @PathVariable Long userId,
                                  @Valid @RequestBody OrgDtos.RoleRequest request) {
        return service.setRole(orgId, CurrentUser.id(), userId, request.role());
    }

    @DeleteMapping("/{orgId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long orgId, @PathVariable Long userId) {
        service.removeMember(orgId, CurrentUser.id(), userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{orgId}/leave")
    public ResponseEntity<Void> leave(@PathVariable Long orgId) {
        service.leave(orgId, CurrentUser.id());
        return ResponseEntity.noContent().build();
    }

    private User currentUser() {
        return users.findById(CurrentUser.id()).orElseThrow(
                () -> com.pkm.common.ApiException.unauthorized("Authentication required"));
    }
}

package com.agenthub.api.admin;

import com.agenthub.application.auth.UserAdminService;
import com.agenthub.common.ApiResponse;
import com.agenthub.domain.user.UserAccount;
import com.agenthub.domain.user.UserAccountStatus;
import java.time.Instant;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class UserAdminController {

    private final UserAdminService userAdminService;

    public UserAdminController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    @GetMapping
    public ApiResponse<?> listUsers() {
        return ApiResponse.success(userAdminService.listUsers().stream().map(this::toView).toList());
    }

    @PostMapping
    public ApiResponse<?> createUser(@RequestBody CreateUserRequest request) {
        return ApiResponse.success(toView(userAdminService.createUser(
                request.username(),
                request.email(),
                request.password(),
                request.isAdmin(),
                request.primaryOrgTag())));
    }

    @PostMapping("/{userId}/status")
    public ApiResponse<?> updateStatus(@PathVariable String userId, @RequestBody UpdateStatusRequest request) {
        return ApiResponse.success(toView(userAdminService.updateStatus(userId, request.status())));
    }

    @PostMapping("/{userId}/reset-password")
    public ApiResponse<?> resetPassword(@PathVariable String userId, @RequestBody ResetPasswordRequest request) {
        return ApiResponse.success(toView(userAdminService.resetPassword(userId, request.newPassword())));
    }

    @PostMapping("/{userId}/admin")
    public ApiResponse<?> updateAdmin(@PathVariable String userId, @RequestBody UpdateAdminRequest request) {
        return ApiResponse.success(toView(userAdminService.updateAdmin(userId, request.isAdmin())));
    }

    private UserAdminView toView(UserAccount userAccount) {
        return new UserAdminView(
                userAccount.id(),
                userAccount.username(),
                userAccount.email(),
                userAccount.displayName(),
                userAccount.status().name(),
                userAccount.isAdmin(),
                userAccount.primaryOrgTag(),
                userAccount.createdAt(),
                userAccount.updatedAt(),
                userAccount.lastLoginAt());
    }

    public record CreateUserRequest(
            @NotBlank @Size(min = 3, max = 64) String username,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 128) String password,
            boolean isAdmin,
            String primaryOrgTag) {
    }

    public record UpdateStatusRequest(UserAccountStatus status) {
    }

    public record ResetPasswordRequest(@NotBlank @Size(min = 8, max = 128) String newPassword) {
    }

    public record UpdateAdminRequest(boolean isAdmin) {
    }

    public record UserAdminView(
            String id,
            String username,
            String email,
            String displayName,
            String status,
            boolean isAdmin,
            String primaryOrgTag,
            Instant createdAt,
            Instant updatedAt,
            Instant lastLoginAt) {
    }
}

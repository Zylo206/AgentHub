package com.agenthub.api.auth;

import com.agenthub.application.auth.AuthSessionService;
import com.agenthub.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthSessionService authSessionService;

    public AuthController(AuthSessionService authSessionService) {
        this.authSessionService = authSessionService;
    }

    @PostMapping("/register")
    public ApiResponse<?> register(@RequestBody RegisterRequest request, HttpServletRequest servletRequest) {
        return ApiResponse.success(
                authSessionService.register(
                        request.username(),
                        request.email(),
                        request.password(),
                        servletRequest.getRemoteAddr(),
                        servletRequest.getHeader("User-Agent")),
                "Register succeeded");
    }

    @PostMapping("/login")
    public ApiResponse<?> login(@RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        return ApiResponse.success(
                authSessionService.login(
                        request.username(),
                        request.password(),
                        servletRequest.getRemoteAddr(),
                        servletRequest.getHeader("User-Agent")),
                "Login succeeded");
    }

    @PostMapping("/refresh")
    public ApiResponse<?> refresh(@RequestBody RefreshRequest request, HttpServletRequest servletRequest) {
        return ApiResponse.success(
                authSessionService.refresh(
                        request.refreshToken(),
                        servletRequest.getRemoteAddr(),
                        servletRequest.getHeader("User-Agent")),
                "Refresh succeeded");
    }

    @GetMapping("/me")
    public ApiResponse<?> me() {
        return ApiResponse.success(authSessionService.current());
    }

    @PostMapping("/logout")
    public ApiResponse<?> logout(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) LogoutRequest request) {
        authSessionService.logout(
                extractBearerToken(authorization),
                request == null ? null : request.refreshToken());
        return ApiResponse.success(Boolean.TRUE, "Logged out");
    }

    private String extractBearerToken(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            return null;
        }
        String prefix = "Bearer ";
        return authorization.startsWith(prefix) ? authorization.substring(prefix.length()).trim() : authorization.trim();
    }

    public record RegisterRequest(
            @NotBlank @Size(min = 3, max = 64) String username,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 128) String password) {
    }

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record LogoutRequest(String refreshToken) {
    }
}

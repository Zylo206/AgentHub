package com.agenthub.api.auth;

import com.agenthub.application.auth.AuthSessionService;
import com.agenthub.common.ApiResponse;
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

    @PostMapping("/login")
    public ApiResponse<?> login(@RequestBody LoginRequest request) {
        return ApiResponse.success(
                authSessionService.login(request.username(), request.password()),
                "Login succeeded");
    }

    @GetMapping("/me")
    public ApiResponse<?> me() {
        return ApiResponse.success(authSessionService.current());
    }

    @PostMapping("/logout")
    public ApiResponse<?> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        authSessionService.logout(extractBearerToken(authorization));
        return ApiResponse.success(Boolean.TRUE, "Logged out");
    }

    private String extractBearerToken(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            return null;
        }
        String prefix = "Bearer ";
        return authorization.startsWith(prefix) ? authorization.substring(prefix.length()).trim() : authorization.trim();
    }

    public record LoginRequest(String username, String password) {
    }
}

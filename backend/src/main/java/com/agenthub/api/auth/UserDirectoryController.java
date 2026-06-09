package com.agenthub.api.auth;

import com.agenthub.application.auth.UserDirectoryService;
import com.agenthub.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserDirectoryController {

    private final UserDirectoryService userDirectoryService;

    public UserDirectoryController(UserDirectoryService userDirectoryService) {
        this.userDirectoryService = userDirectoryService;
    }

    @GetMapping("/directory")
    public ApiResponse<?> searchDirectory(@RequestParam(value = "query", required = false) String query) {
        return ApiResponse.success(userDirectoryService.search(query));
    }
}

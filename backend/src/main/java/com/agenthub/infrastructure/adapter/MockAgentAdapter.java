package com.agenthub.infrastructure.adapter;

import com.agenthub.common.TimeProvider;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class MockAgentAdapter implements AgentAdapter {

    private final TimeProvider timeProvider;

    public MockAgentAdapter(TimeProvider timeProvider) {
        this.timeProvider = timeProvider;
    }

    @Override
    public AgentAdapterType type() {
        return AgentAdapterType.MOCK;
    }

    @Override
    public AgentAdapterDescriptor describe() {
        return new AgentAdapterDescriptor(
                AgentAdapterType.MOCK,
                AgentAdapterHealthStatus.AVAILABLE,
                true,
                false,
                "Stable local mock adapter for deterministic demo responses.",
                null);
    }

    @Override
    public AgentResponse execute(AgentRequest request) {
        Instant startedAt = timeProvider.now();
        String prompt = ((request.taskDescription() == null ? "" : request.taskDescription()) + "\n"
                + (request.userInput() == null ? "" : request.userInput())).toLowerCase();

        String content;
        List<String> producedArtifactHints;

        if (containsAny(prompt, "frontend", "react", "page", "页面", "component", "ui")) {
            content = """
                    Mock Frontend Builder response:
                    - Prepared a React-oriented page implementation plan.
                    - Suggested a code artifact such as LoginPage.tsx.
                    - Preserved simple structure for preview and follow-up revision.
                    """;
            producedArtifactHints = List.of("CODE:LoginPage.tsx", "MARKDOWN:README.md");
        } else if (containsAny(prompt, "backend", "api", "data model", "contract", "数据库", "接口")) {
            content = """
                    Mock Backend Worker response:
                    - Prepared an API contract and data model outline.
                    - Recommended keeping request and response fields explicit for later review.
                    """;
            producedArtifactHints = List.of("API_CONTRACT:login-api-contract.json", "DATA_MODEL:login-data-model.md");
        } else if (containsAny(prompt, "review", "检查", "验收", "quality", "risk")) {
            content = """
                    Mock Reviewer response:
                    - Checked the request against acceptance criteria.
                    - Highlighted likely issues, suggestions, and overall risk.
                    """;
            producedArtifactHints = List.of("REVIEW_REPORT:review-report.md");
        } else {
            content = """
                    Mock Agent response:
                    - Captured the request successfully.
                    - This demo build uses a local mock adapter instead of a real external platform.
                    """;
            producedArtifactHints = List.of("TEXT:general-agent-response");
        }

        return new AgentResponse(
                request.requestId(),
                AgentAdapterType.MOCK,
                AgentAdapterType.MOCK,
                AgentAdapterType.MOCK,
                false,
                AgentExecutionStatus.COMPLETED,
                content,
                producedArtifactHints,
                null,
                startedAt,
                timeProvider.now());
    }

    private boolean containsAny(String input, String... keywords) {
        for (String keyword : keywords) {
            if (input.contains(keyword.toLowerCase())) {
                return true;
            }
        }
        return false;
    }
}

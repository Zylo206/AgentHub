package com.agenthub.application.orchestrator;

import com.agenthub.domain.agent.Agent;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class ToolCapabilityRegistry {

    public List<String> resolveCapabilities(Agent agent) {
        if (agent == null || agent.getToolTags().isEmpty()) {
            return List.of();
        }

        return agent.getToolTags().stream()
                .map(this::normalizeToolTag)
                .flatMap(toolTag -> capabilitiesForToolTag(toolTag).stream())
                .distinct()
                .toList();
    }

    public boolean supportsRequiredSkill(Agent agent, String requiredSkill) {
        return matchScore(agent, requiredSkill) > 0;
    }

    public int matchScore(Agent agent, String requiredSkill) {
        if (agent == null || requiredSkill == null || requiredSkill.isBlank()) {
            return 1;
        }
        List<String> capabilities = resolveCapabilities(agent);
        if (capabilities.isEmpty()) {
            return 0;
        }

        String normalizedSkill = requiredSkill.trim().toUpperCase(Locale.ROOT);
        int bestScore = 0;
        for (String capability : capabilities) {
            if (normalizedSkill.equals(capability)) {
                bestScore = Math.max(bestScore, 100);
            } else if (matchesSkillAlias(normalizedSkill, capability)) {
                bestScore = Math.max(bestScore, 90);
            } else if (normalizedSkill.contains(capability)) {
                bestScore = Math.max(bestScore, 80);
            } else if (capability.contains(normalizedSkill)) {
                bestScore = Math.max(bestScore, 70);
            }
        }
        return bestScore;
    }

    public String describeCapabilities(Agent agent) {
        List<String> capabilities = resolveCapabilities(agent);
        if (capabilities.isEmpty()) {
            return "No explicit tool capability mapping; router treats the Agent as general-purpose.";
        }
        return "Tool capabilities: " + String.join(", ", capabilities);
    }

    private String normalizeToolTag(String toolTag) {
        return toolTag == null ? "" : toolTag.trim().toLowerCase(Locale.ROOT);
    }

    private List<String> capabilitiesForToolTag(String toolTag) {
        return switch (toolTag) {
            case "code", "coding", "code_editor", "frontend", "react" -> List.of("CODE", "FRONTEND_ARTIFACT_GENERATION");
            case "preview", "web", "ui" -> List.of("WEB_PREVIEW", "ARTIFACT_PREVIEW", "FRONTEND_ARTIFACT_GENERATION");
            case "review", "review_checker", "qa", "quality" -> List.of("REVIEW_REPORT", "QUALITY_REVIEW");
            case "deploy", "deployment", "release" -> List.of("DEPLOYMENT", "DEPLOY_PREVIEW");
            case "api", "backend", "contract_writer" -> List.of("API_CONTRACT", "API_CONTRACT_DESIGN");
            case "schema", "schema_designer", "data_model" -> List.of("DATA_MODEL", "API_CONTRACT_DESIGN");
            case "task_planner" -> List.of("PLANNING", "TASK_PLANNING");
            case "task_router" -> List.of("ROUTING", "AGENT_ROUTING");
            default -> toolTag.isBlank() ? List.of() : List.of(toolTag.toUpperCase(Locale.ROOT));
        };
    }

    private boolean matchesSkillAlias(String requiredSkill, String capability) {
        if ("FRONTEND_ARTIFACT_GENERATION".equals(requiredSkill)) {
            return capability.equals("CODE") || capability.equals("WEB_PREVIEW") || capability.equals("ARTIFACT_PREVIEW");
        }
        if ("QUALITY_REVIEW".equals(requiredSkill)) {
            return capability.equals("REVIEW_REPORT");
        }
        if ("API_CONTRACT_DESIGN".equals(requiredSkill)) {
            return capability.equals("API_CONTRACT");
        }
        return false;
    }
}

package com.agenthub.infrastructure.adapter;

import org.springframework.stereotype.Component;

@Component
public class CodexArtifactPromptBuilder {

    public String build(AgentRequest request) {
        StringBuilder builder = new StringBuilder();
        builder.append("You are Codex running inside AgentHub Artifact-only adapter mode.\n");
        builder.append("You must not modify files, apply patches, run commands, or write to the workspace.\n");
        builder.append("Return exactly one valid JSON object and nothing else.\n");
        builder.append("The first non-whitespace character must be { and the last non-whitespace character must be }.\n");
        builder.append("Do not include Markdown fences, CLI logs, wrapper metadata, stdout/stderr, usage stats, or explanations outside JSON.\n\n");
        builder.append("Agent name: ").append(nullToBlank(request.agentName())).append('\n');
        if (!nullToBlank(request.systemPrompt()).isBlank()) {
            builder.append("Agent system prompt:\n").append(request.systemPrompt()).append("\n\n");
        }
        if (!nullToBlank(request.taskDescription()).isBlank()) {
            builder.append("Task description:\n").append(request.taskDescription()).append("\n\n");
        }
        if (!nullToBlank(request.userInput()).isBlank()) {
            builder.append("User input:\n").append(request.userInput()).append("\n\n");
        }
        if (!request.contextItems().isEmpty()) {
            builder.append("Context items:\n");
            request.contextItems().forEach(item -> builder.append("- ").append(item).append('\n'));
            builder.append('\n');
        }
        if (!request.artifactSummaries().isEmpty()) {
            builder.append("Artifact summaries:\n");
            request.artifactSummaries().forEach(item -> builder.append("- ").append(item).append('\n'));
            builder.append('\n');
        }
        builder.append("""
                AgentHub Artifact JSON contract:
                {
                  "assistantMessage": "short summary for AgentHub chat",
                  "artifacts": [
                    {
                      "title": "file or report title",
                      "type": "CODE | MARKDOWN | REVIEW_REPORT | API_CONTRACT | DATA_MODEL | WEB_PREVIEW",
                      "language": "tsx | ts | js | md | json | html | txt",
                      "summary": "one sentence summary",
                      "content": "complete artifact content"
                    }
                  ]
                }

                Required rules:
                - Return only the JSON object. No Markdown fences. No prose outside JSON.
                - The root object must contain assistantMessage and artifacts only.
                - Artifact type must be exactly one of CODE, MARKDOWN, REVIEW_REPORT, API_CONTRACT, DATA_MODEL, WEB_PREVIEW.
                - Every artifact must have non-empty title, type, language, content, and summary.
                - CODE content must be complete raw source code inside the JSON string, not Markdown fenced code, not comments explaining code, and not CLI wrapper output.
                - REVIEW_REPORT and MARKDOWN content must be useful Markdown body text without outer code fences.
                - API_CONTRACT and DATA_MODEL content should be structured JSON text or schema text.
                - Summary must explain what the artifact contains in one concise sentence.
                - If you cannot complete the task, return a REVIEW_REPORT artifact with blockers and retry advice inside content.
                - Empty content, provider error text, plain text responses, invalid JSON, missing fields, Markdown fences, CLI logs, or wrapper metadata will be rejected.
                """);
        return builder.toString();
    }

    public String buildJsonSchema() {
        return """
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": ["assistantMessage", "artifacts"],
                  "properties": {
                    "assistantMessage": {
                      "type": "string",
                      "minLength": 1
                    },
                    "artifacts": {
                      "type": "array",
                      "minItems": 1,
                      "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": ["title", "type", "language", "content", "summary"],
                        "properties": {
                          "title": {
                            "type": "string",
                            "minLength": 1
                          },
                          "type": {
                            "type": "string",
                            "enum": ["CODE", "MARKDOWN", "REVIEW_REPORT", "API_CONTRACT", "DATA_MODEL", "WEB_PREVIEW"]
                          },
                          "language": {
                            "type": "string",
                            "minLength": 1
                          },
                          "content": {
                            "type": "string",
                            "minLength": 1
                          },
                          "summary": {
                            "type": "string",
                            "minLength": 1
                          }
                        }
                      }
                    }
                  }
                }
                """;
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }
}

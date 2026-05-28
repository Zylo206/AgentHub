package com.agenthub.infrastructure.adapter;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class AdapterArtifactContractValidatorTest {

    private final AdapterArtifactContractValidator validator =
            new AdapterArtifactContractValidator(new ObjectMapper());

    @Test
    void acceptsValidArtifactJsonContract() {
        AdapterArtifactContractValidator.ValidationResult result = validator.validate("""
                {
                  "assistantMessage": "Generated a login component.",
                  "artifacts": [
                    {
                      "title": "LoginPage.tsx",
                      "type": "CODE",
                      "language": "tsx",
                      "content": "import React from 'react';\\nexport default function LoginPage() {\\n  return <form><button>Sign in</button></form>;\\n}",
                      "summary": "React login page."
                    }
                  ]
                }
                """);

        assertTrue(result.valid(), result.errorMessage());
        assertTrue(result.normalizedJson().contains("LoginPage.tsx"));
    }

    @Test
    void rejectsMarkdownFencedRootJson() {
        AdapterArtifactContractValidator.ValidationResult result = validator.validate("""
                ```json
                {"assistantMessage":"x","artifacts":[]}
                ```
                """);

        assertFalse(result.valid());
        assertTrue(result.errorMessage().contains("must not use Markdown fences"));
    }

    @Test
    void rejectsMissingRequiredArtifactFields() {
        AdapterArtifactContractValidator.ValidationResult result = validator.validate("""
                {
                  "assistantMessage": "Generated something.",
                  "artifacts": [
                    {
                      "title": "LoginPage.tsx",
                      "type": "CODE",
                      "language": "tsx",
                      "content": "export default function LoginPage() { return <div />; }"
                    }
                  ]
                }
                """);

        assertFalse(result.valid());
        assertTrue(result.errorMessage().contains("summary must be a non-empty string"));
    }

    @Test
    void rejectsUnsupportedArtifactType() {
        AdapterArtifactContractValidator.ValidationResult result = validator.validate("""
                {
                  "assistantMessage": "Generated something.",
                  "artifacts": [
                    {
                      "title": "slides.pptx",
                      "type": "PPT",
                      "language": "pptx",
                      "content": "placeholder",
                      "summary": "Slides."
                    }
                  ]
                }
                """);

        assertFalse(result.valid());
        assertTrue(result.errorMessage().contains("unsupported"));
    }

    @Test
    void rejectsCodeArtifactWrappedInMarkdownFence() {
        AdapterArtifactContractValidator.ValidationResult result = validator.validate("""
                {
                  "assistantMessage": "Generated code.",
                  "artifacts": [
                    {
                      "title": "LoginPage.tsx",
                      "type": "CODE",
                      "language": "tsx",
                      "content": "```tsx\\nexport default function LoginPage() { return <div />; }\\n```",
                      "summary": "React login page."
                    }
                  ]
                }
                """);

        assertFalse(result.valid());
        assertTrue(result.errorMessage().contains("raw source code"));
    }

    @Test
    void rejectsProviderErrorTextAsArtifactContent() {
        AdapterArtifactContractValidator.ValidationResult result = validator.validate("""
                {
                  "assistantMessage": "Provider failed.",
                  "artifacts": [
                    {
                      "title": "error.md",
                      "type": "MARKDOWN",
                      "language": "md",
                      "content": "Error: unauthorized API key",
                      "summary": "Error payload."
                    }
                  ]
                }
                """);

        assertFalse(result.valid());
        assertTrue(result.errorMessage().contains("provider error"));
    }
}

package com.agenthub.application.orchestrator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.agenthub.domain.artifact.ArtifactType;
import java.util.List;
import org.junit.jupiter.api.Test;

class AdapterArtifactQualityEvaluatorTest {

    private final AdapterArtifactQualityEvaluator evaluator = new AdapterArtifactQualityEvaluator();

    @Test
    void acceptsValidCodeArtifactWithPassedBuildHeuristics() {
        AdapterArtifactQualityEvaluator.QualityReport report = evaluator.evaluate(new AdapterArtifactExtractor.ExtractionResult(
                "Generated a login component.",
                List.of(new AdapterArtifactExtractor.AdapterArtifactSpec(
                        "LoginPage.tsx",
                        ArtifactType.CODE,
                        "tsx",
                        """
                                import React from "react";

                                export default function LoginPage() {
                                  const label = "Sign in";
                                  return <form><button>{label}</button></form>;
                                }
                                """,
                        "React login component.")),
                null));

        assertEquals("VALID_JSON_ARTIFACTS", report.parseStatus());
        assertEquals("ACCEPTED", report.qualityStatus());
        assertEquals("PASSED", report.buildValidationStatus());
        assertTrue(report.hasAcceptedArtifacts());
    }

    @Test
    void rejectsCodeArtifactThatLooksLikeMarkdown() {
        AdapterArtifactQualityEvaluator.QualityReport report = evaluator.evaluate(new AdapterArtifactExtractor.ExtractionResult(
                "Generated invalid code.",
                List.of(new AdapterArtifactExtractor.AdapterArtifactSpec(
                        "LoginPage.tsx",
                        ArtifactType.CODE,
                        "tsx",
                        """
                                # Login Page

                                This is a markdown explanation instead of source code.
                                """,
                        "Markdown masquerading as code.")),
                null));

        assertEquals("REJECTED", report.qualityStatus());
        assertEquals("QUALITY_FAILED", classifyOutcome(report));
        assertTrue(report.artifactQualities().get(0).qualityReason().contains("outcome=QUALITY_FAILED"));
        assertTrue(report.artifactQualities().get(0).qualityReason()
                .contains("CODE artifact content does not look like raw source code"));
    }

    @Test
    void rejectsCodeArtifactWithBuildFailure() {
        AdapterArtifactQualityEvaluator.QualityReport report = evaluator.evaluate(new AdapterArtifactExtractor.ExtractionResult(
                "Generated broken code.",
                List.of(new AdapterArtifactExtractor.AdapterArtifactSpec(
                        "BrokenLoginPage.tsx",
                        ArtifactType.CODE,
                        "tsx",
                        """
                                export default function BrokenLoginPage() {
                                  return <form><button>Sign in</button></form>;
                                """,
                        "Broken React login component.")),
                null));

        assertEquals("REJECTED", report.qualityStatus());
        assertEquals("FAILED", report.buildValidationStatus());
        assertEquals("BUILD_FAILED", classifyOutcome(report));
        assertTrue(report.artifactQualities().get(0).qualityReason().contains("outcome=BUILD_FAILED"));
        assertTrue(report.buildValidationReason().contains("unbalanced"));
    }

    @Test
    void rejectsFallbackTextExtractionForRealFirstPromotion() {
        AdapterArtifactQualityEvaluator.QualityReport report = evaluator.evaluate(new AdapterArtifactExtractor.ExtractionResult(
                null,
                List.of(new AdapterArtifactExtractor.AdapterArtifactSpec(
                        "Real Adapter Output - Reviewer - Step 3.md",
                        ArtifactType.REVIEW_REPORT,
                        "md",
                        "Plain text adapter output without the AgentHub JSON contract.",
                        "Plain text fallback.")),
                "adapter output was not valid artifact JSON; persisted as fallback text artifact"));

        assertEquals("FALLBACK_TEXT", report.parseStatus());
        assertEquals("ACCEPTED", report.qualityStatus());
        assertTrue(report.qualityReason().contains("fallback text artifact"));
    }

    private String classifyOutcome(AdapterArtifactQualityEvaluator.QualityReport report) {
        if ("FAILED".equals(report.buildValidationStatus())) {
            return "BUILD_FAILED";
        }
        if ("REJECTED".equals(report.qualityStatus())) {
            return "QUALITY_FAILED";
        }
        if (!"VALID_JSON_ARTIFACTS".equals(report.parseStatus())) {
            return "PARSE_FAILED";
        }
        return "ACCEPTED";
    }
}

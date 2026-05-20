package com.agenthub.domain.artifact;

public record ArtifactId(String value) {

    public ArtifactId {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("artifactId must not be blank");
        }
    }
}

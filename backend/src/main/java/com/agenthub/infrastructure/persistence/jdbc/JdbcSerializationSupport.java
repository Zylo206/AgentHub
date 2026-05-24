package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.message.MessageAttachment;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

final class JdbcSerializationSupport {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};
    private static final TypeReference<List<Integer>> INTEGER_LIST = new TypeReference<>() {};
    private static final TypeReference<List<MessageAttachment>> ATTACHMENT_LIST = new TypeReference<>() {};

    private JdbcSerializationSupport() {
    }

    static String toJson(Object value) {
        try {
            return OBJECT_MAPPER.writeValueAsString(value == null ? List.of() : value);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to serialize JDBC payload", exception);
        }
    }

    static List<String> stringList(String json) {
        return read(json, STRING_LIST, List.of());
    }

    static List<Integer> integerList(String json) {
        return read(json, INTEGER_LIST, List.of());
    }

    static List<MessageAttachment> attachmentList(String json) {
        return read(json, ATTACHMENT_LIST, List.of());
    }

    static List<ArtifactId> artifactIds(String json) {
        return stringList(json).stream().map(ArtifactId::new).toList();
    }

    static String artifactIdsJson(List<ArtifactId> artifactIds) {
        return toJson(artifactIds == null ? List.of() : artifactIds.stream().map(ArtifactId::value).toList());
    }

    static Timestamp timestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    static Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private static <T> T read(String json, TypeReference<T> typeReference, T fallback) {
        if (json == null || json.isBlank()) {
            return fallback;
        }
        try {
            return OBJECT_MAPPER.readValue(json, typeReference);
        } catch (Exception exception) {
            return fallback;
        }
    }
}

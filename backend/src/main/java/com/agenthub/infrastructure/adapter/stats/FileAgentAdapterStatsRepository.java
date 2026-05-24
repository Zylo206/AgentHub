package com.agenthub.infrastructure.adapter.stats;

import com.agenthub.common.TimeProvider;
import com.agenthub.infrastructure.adapter.AgentAdapterRegistry.AdapterRouteStats;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

@Repository
public class FileAgentAdapterStatsRepository implements AgentAdapterStatsRepository {

    private static final Logger logger = LoggerFactory.getLogger(FileAgentAdapterStatsRepository.class);
    private static final int SNAPSHOT_VERSION = 1;

    private final ObjectMapper objectMapper;
    private final TimeProvider timeProvider;
    private final boolean enabled;
    private final Path snapshotPath;

    public FileAgentAdapterStatsRepository(
            ObjectMapper objectMapper,
            TimeProvider timeProvider,
            @Value("${agenthub.adapters.stats.persistence.enabled:true}") boolean enabled,
            @Value("${agenthub.adapters.stats.persistence.path:./.agenthub/adapter-route-stats.json}") String path) {
        this.objectMapper = objectMapper;
        this.timeProvider = timeProvider;
        this.enabled = enabled;
        this.snapshotPath = path == null || path.isBlank() ? null : Paths.get(path);
    }

    @Override
    public Map<AgentAdapterType, AdapterRouteStats> load() {
        if (!enabled || snapshotPath == null || !Files.exists(snapshotPath)) {
            return Map.of();
        }

        try {
            StatsSnapshot snapshot = objectMapper.readValue(snapshotPath.toFile(), StatsSnapshot.class);
            Map<AgentAdapterType, AdapterRouteStats> stats = new EnumMap<>(AgentAdapterType.class);
            if (snapshot.adapters == null) {
                return stats;
            }
            snapshot.adapters.forEach((adapterType, value) -> {
                if (value == null) {
                    return;
                }
                try {
                    stats.put(
                            AgentAdapterType.valueOf(adapterType),
                            new AdapterRouteStats(
                                    safeCounter(value.attempts),
                                    safeCounter(value.successes),
                                    safeCounter(value.fallbacks),
                                    safeCounter(value.failures)));
                } catch (IllegalArgumentException exception) {
                    logger.warn("Ignoring unknown adapter type in route stats snapshot: {}", adapterType);
                }
            });
            return stats;
        } catch (IOException | RuntimeException exception) {
            logger.warn("Failed to load adapter route stats from {}. Starting with empty stats.",
                    snapshotPath,
                    exception);
            return Map.of();
        }
    }

    @Override
    public synchronized void save(Map<AgentAdapterType, AdapterRouteStats> stats) {
        if (!enabled || snapshotPath == null) {
            return;
        }

        Path tempPath = null;
        try {
            Path parent = snapshotPath.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }

            StatsSnapshot snapshot = StatsSnapshot.from(stats, timeProvider.now().toString());
            tempPath = Files.createTempFile(
                    parent == null ? Paths.get(".") : parent,
                    snapshotPath.getFileName().toString() + ".",
                    ".tmp");
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(tempPath.toFile(), snapshot);
            moveSnapshot(tempPath, snapshotPath);
        } catch (IOException | RuntimeException exception) {
            logger.warn("Failed to persist adapter route stats to {}. Execution will continue.",
                    snapshotPath,
                    exception);
            cleanupTempFile(tempPath);
        }
    }

    private void moveSnapshot(Path tempPath, Path targetPath) throws IOException {
        try {
            Files.move(
                    tempPath,
                    targetPath,
                    StandardCopyOption.REPLACE_EXISTING,
                    StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException exception) {
            Files.move(tempPath, targetPath, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private void cleanupTempFile(Path tempPath) {
        if (tempPath == null) {
            return;
        }
        try {
            Files.deleteIfExists(tempPath);
        } catch (IOException exception) {
            logger.warn("Failed to clean temporary adapter route stats file: {}", tempPath, exception);
        }
    }

    private static long safeCounter(long value) {
        return Math.max(0, value);
    }

    private static class StatsSnapshot {
        public int version = SNAPSHOT_VERSION;
        public String updatedAt;
        public Map<String, StatsValue> adapters = new LinkedHashMap<>();

        public static StatsSnapshot from(Map<AgentAdapterType, AdapterRouteStats> stats, String updatedAt) {
            StatsSnapshot snapshot = new StatsSnapshot();
            snapshot.version = SNAPSHOT_VERSION;
            snapshot.updatedAt = updatedAt;
            stats.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .forEach(entry -> snapshot.adapters.put(entry.getKey().name(), StatsValue.from(entry.getValue())));
            return snapshot;
        }
    }

    private static class StatsValue {
        public long attempts;
        public long successes;
        public long fallbacks;
        public long failures;

        public static StatsValue from(AdapterRouteStats stats) {
            StatsValue value = new StatsValue();
            value.attempts = stats.attempts();
            value.successes = stats.successes();
            value.fallbacks = stats.fallbacks();
            value.failures = stats.failures();
            return value;
        }
    }
}

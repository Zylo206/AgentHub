package com.agenthub.application.agent;

import com.agenthub.common.TimeProvider;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AdapterQualityMetricsService {

    private static final Logger logger = LoggerFactory.getLogger(AdapterQualityMetricsService.class);
    private static final int SNAPSHOT_VERSION = 1;

    private final ObjectMapper objectMapper;
    private final TimeProvider timeProvider;
    private final boolean persistenceEnabled;
    private final Path snapshotPath;
    private final Map<AgentAdapterType, MutableQualityMetrics> metrics = new EnumMap<>(AgentAdapterType.class);

    public AdapterQualityMetricsService(
            ObjectMapper objectMapper,
            TimeProvider timeProvider,
            @Value("${agenthub.adapters.quality.persistence.enabled:true}") boolean persistenceEnabled,
            @Value("${agenthub.adapters.quality.persistence.path:./.agenthub/adapter-quality-metrics.json}") String path) {
        this.objectMapper = objectMapper;
        this.timeProvider = timeProvider;
        this.persistenceEnabled = persistenceEnabled;
        this.snapshotPath = path == null || path.isBlank() ? null : Paths.get(path);
        loadSnapshot();
    }

    public void record(QualityObservation observation) {
        if (observation == null || observation.adapterType() == null) {
            return;
        }

        Map<AgentAdapterType, AdapterQualityMetrics> snapshot;
        synchronized (this) {
            MutableQualityMetrics row =
                    metrics.computeIfAbsent(observation.adapterType(), ignored -> new MutableQualityMetrics());
            row.attempts.incrementAndGet();
            if (observation.adapterExecutionSucceeded()) {
                row.successes.incrementAndGet();
            }
            if (observation.fallbackUsed()) {
                row.fallbacks.incrementAndGet();
            }
            if (observation.realOutputAccepted()) {
                row.realOutputAccepted.incrementAndGet();
            }
            if (isParseFailure(observation.parseStatus())) {
                row.parseFailures.incrementAndGet();
            }
            if (isBuildFailure(observation.buildValidationStatus())) {
                row.buildFailures.incrementAndGet();
            }
            if (isQualityFailure(observation.qualityStatus())) {
                row.qualityFailures.incrementAndGet();
            }
            row.lastQualityStatus = observation.qualityStatus();
            row.lastQualityReason = observation.qualityReason();
            row.updatedAt = timeProvider.now().toString();
            snapshot = snapshot();
        }
        persist(snapshot);
    }

    public synchronized List<AdapterQualityMetricsView> listMetrics() {
        return snapshot().entrySet().stream()
                .sorted(Comparator.comparing(entry -> entry.getKey().name()))
                .map(entry -> AdapterQualityMetricsView.from(entry.getKey(), entry.getValue()))
                .toList();
    }

    private boolean isParseFailure(String status) {
        if (status == null || status.isBlank()) {
            return false;
        }
        return !List.of("VALID_JSON_ARTIFACTS", "TEXT_FALLBACK", "NOT_ATTEMPTED", "SKIPPED", "EMPTY")
                .contains(status);
    }

    private boolean isBuildFailure(String status) {
        return status != null
                && !status.isBlank()
                && !"PASSED".equals(status)
                && !"NOT_EVALUATED".equals(status)
                && !"SKIPPED".equals(status);
    }

    private boolean isQualityFailure(String status) {
        return "REJECTED".equals(status) || "FAILED".equals(status);
    }

    private Map<AgentAdapterType, AdapterQualityMetrics> snapshot() {
        Map<AgentAdapterType, AdapterQualityMetrics> copy = new EnumMap<>(AgentAdapterType.class);
        metrics.forEach((adapterType, value) -> copy.put(adapterType, AdapterQualityMetrics.from(value)));
        return Map.copyOf(copy);
    }

    private void loadSnapshot() {
        if (!persistenceEnabled || snapshotPath == null || !Files.exists(snapshotPath)) {
            return;
        }

        try {
            QualitySnapshot snapshot = objectMapper.readValue(snapshotPath.toFile(), QualitySnapshot.class);
            if (snapshot.adapters == null) {
                return;
            }
            synchronized (this) {
                snapshot.adapters.forEach((adapterType, value) -> {
                    try {
                        metrics.put(AgentAdapterType.valueOf(adapterType), MutableQualityMetrics.from(value));
                    } catch (IllegalArgumentException ignored) {
                        logger.warn("Ignoring unknown adapter type in quality metrics snapshot: {}", adapterType);
                    }
                });
            }
        } catch (IOException | RuntimeException exception) {
            logger.warn("Failed to load adapter quality metrics from {}. Starting empty.", snapshotPath, exception);
        }
    }

    private void persist(Map<AgentAdapterType, AdapterQualityMetrics> snapshot) {
        if (!persistenceEnabled || snapshotPath == null) {
            return;
        }

        Path tempPath = null;
        try {
            Path parent = snapshotPath.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            tempPath = Files.createTempFile(
                    parent == null ? Paths.get(".") : parent,
                    snapshotPath.getFileName().toString() + ".",
                    ".tmp");
            objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValue(tempPath.toFile(), QualitySnapshot.from(snapshot, timeProvider.now().toString()));
            moveSnapshot(tempPath, snapshotPath);
        } catch (IOException | RuntimeException exception) {
            logger.warn("Failed to persist adapter quality metrics to {}.", snapshotPath, exception);
            cleanupTempFile(tempPath);
        }
    }

    private void moveSnapshot(Path tempPath, Path targetPath) throws IOException {
        try {
            Files.move(tempPath, targetPath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
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
            logger.warn("Failed to clean temporary adapter quality metrics file: {}", tempPath, exception);
        }
    }

    public record QualityObservation(
            AgentAdapterType adapterType,
            boolean adapterExecutionSucceeded,
            boolean fallbackUsed,
            boolean realOutputAccepted,
            String parseStatus,
            String buildValidationStatus,
            String qualityStatus,
            String qualityReason) {
    }

    private record AdapterQualityMetrics(
            long attempts,
            long successes,
            long fallbacks,
            long realOutputAccepted,
            long parseFailures,
            long qualityFailures,
            long buildFailures,
            String lastQualityStatus,
            String lastQualityReason,
            String updatedAt) {

        static AdapterQualityMetrics from(MutableQualityMetrics value) {
            return new AdapterQualityMetrics(
                    value.attempts.get(),
                    value.successes.get(),
                    value.fallbacks.get(),
                    value.realOutputAccepted.get(),
                    value.parseFailures.get(),
                    value.qualityFailures.get(),
                    value.buildFailures.get(),
                    value.lastQualityStatus,
                    value.lastQualityReason,
                    value.updatedAt);
        }
    }

    public record AdapterQualityMetricsView(
            String adapterType,
            long attempts,
            long successes,
            long fallbacks,
            long realOutputAccepted,
            long parseFailures,
            long qualityFailures,
            long buildFailures,
            double successRate,
            double fallbackRate,
            String lastQualityStatus,
            String lastQualityReason,
            String updatedAt) {

        static AdapterQualityMetricsView from(AgentAdapterType adapterType, AdapterQualityMetrics value) {
            long attempts = Math.max(0, value.attempts());
            return new AdapterQualityMetricsView(
                    adapterType.name(),
                    attempts,
                    value.successes(),
                    value.fallbacks(),
                    value.realOutputAccepted(),
                    value.parseFailures(),
                    value.qualityFailures(),
                    value.buildFailures(),
                    attempts == 0 ? 0 : (double) value.successes() / attempts,
                    attempts == 0 ? 0 : (double) value.fallbacks() / attempts,
                    value.lastQualityStatus(),
                    value.lastQualityReason(),
                    value.updatedAt());
        }
    }

    private static class MutableQualityMetrics {
        private final AtomicLong attempts = new AtomicLong();
        private final AtomicLong successes = new AtomicLong();
        private final AtomicLong fallbacks = new AtomicLong();
        private final AtomicLong realOutputAccepted = new AtomicLong();
        private final AtomicLong parseFailures = new AtomicLong();
        private final AtomicLong qualityFailures = new AtomicLong();
        private final AtomicLong buildFailures = new AtomicLong();
        private String lastQualityStatus;
        private String lastQualityReason;
        private String updatedAt;

        static MutableQualityMetrics from(SnapshotValue value) {
            MutableQualityMetrics metrics = new MutableQualityMetrics();
            metrics.attempts.set(Math.max(0, value.attempts));
            metrics.successes.set(Math.max(0, value.successes));
            metrics.fallbacks.set(Math.max(0, value.fallbacks));
            metrics.realOutputAccepted.set(Math.max(0, value.realOutputAccepted));
            metrics.parseFailures.set(Math.max(0, value.parseFailures));
            metrics.qualityFailures.set(Math.max(0, value.qualityFailures));
            metrics.buildFailures.set(Math.max(0, value.buildFailures));
            metrics.lastQualityStatus = value.lastQualityStatus;
            metrics.lastQualityReason = value.lastQualityReason;
            metrics.updatedAt = value.updatedAt;
            return metrics;
        }
    }

    private static class QualitySnapshot {
        public int version = SNAPSHOT_VERSION;
        public String updatedAt;
        public Map<String, SnapshotValue> adapters = new LinkedHashMap<>();

        static QualitySnapshot from(Map<AgentAdapterType, AdapterQualityMetrics> metrics, String updatedAt) {
            QualitySnapshot snapshot = new QualitySnapshot();
            snapshot.version = SNAPSHOT_VERSION;
            snapshot.updatedAt = updatedAt;
            metrics.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .forEach(entry -> snapshot.adapters.put(entry.getKey().name(), SnapshotValue.from(entry.getValue())));
            return snapshot;
        }
    }

    private static class SnapshotValue {
        public long attempts;
        public long successes;
        public long fallbacks;
        public long realOutputAccepted;
        public long parseFailures;
        public long qualityFailures;
        public long buildFailures;
        public String lastQualityStatus;
        public String lastQualityReason;
        public String updatedAt;

        static SnapshotValue from(AdapterQualityMetrics value) {
            SnapshotValue snapshot = new SnapshotValue();
            snapshot.attempts = value.attempts();
            snapshot.successes = value.successes();
            snapshot.fallbacks = value.fallbacks();
            snapshot.realOutputAccepted = value.realOutputAccepted();
            snapshot.parseFailures = value.parseFailures();
            snapshot.qualityFailures = value.qualityFailures();
            snapshot.buildFailures = value.buildFailures();
            snapshot.lastQualityStatus = value.lastQualityStatus();
            snapshot.lastQualityReason = value.lastQualityReason();
            snapshot.updatedAt = value.updatedAt();
            return snapshot;
        }
    }
}

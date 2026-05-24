package com.agenthub.infrastructure.adapter;

import com.agenthub.common.TimeProvider;
import com.agenthub.infrastructure.adapter.stats.AgentAdapterStatsRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AgentAdapterRegistry {

    private static final Logger logger = LoggerFactory.getLogger(AgentAdapterRegistry.class);

    private final Map<AgentAdapterType, AgentAdapter> adapterMap;
    private final Map<AgentAdapterType, MutableRouteStats> routeStats = new EnumMap<>(AgentAdapterType.class);
    private final AgentAdapterStatsRepository statsRepository;
    private final AgentAdapterType defaultAdapterType;
    private final TimeProvider timeProvider;

    public AgentAdapterRegistry(
            List<AgentAdapter> adapters,
            AgentAdapterStatsRepository statsRepository,
            TimeProvider timeProvider,
            @Value("${agenthub.adapters.default-type:MOCK}") String defaultAdapterType) {
        this.timeProvider = timeProvider;
        this.statsRepository = statsRepository;
        this.defaultAdapterType = parseAdapterType(defaultAdapterType);
        this.adapterMap = new EnumMap<>(AgentAdapterType.class);

        for (AgentAdapter adapter : adapters) {
            this.adapterMap.put(adapter.type(), adapter);
        }

        if (!this.adapterMap.containsKey(AgentAdapterType.MOCK)) {
            throw new IllegalStateException("MOCK adapter must be registered.");
        }

        loadPersistedRouteStats();
    }

    public List<AgentAdapterType> listAdapters() {
        List<AgentAdapterType> adapterTypes = new ArrayList<>(adapterMap.keySet());
        adapterTypes.sort(Comparator.comparing(Enum::name));
        return List.copyOf(adapterTypes);
    }

    public List<AgentAdapterDescriptor> listDescriptors() {
        List<AgentAdapterDescriptor> descriptors = adapterMap.values().stream()
                .map(AgentAdapter::describe)
                .sorted(Comparator.comparing(descriptor -> descriptor.adapterType().name()))
                .toList();
        return List.copyOf(descriptors);
    }

    public synchronized AdapterRouteStats routeStats(AgentAdapterType adapterType) {
        if (adapterType == null) {
            return AdapterRouteStats.empty();
        }
        return AdapterRouteStats.from(routeStats.computeIfAbsent(adapterType, ignored -> new MutableRouteStats()));
    }

    public AgentAdapter getAdapter(AgentAdapterType type) {
        AgentAdapter adapter = adapterMap.get(type);
        if (adapter == null) {
            throw new IllegalArgumentException("Adapter not registered: " + type);
        }
        return adapter;
    }

    public AgentAdapter getDefaultAdapter() {
        return getAdapter(defaultAdapterType);
    }

    public AgentResponse executeWithFallback(AgentAdapterType preferredType, AgentRequest request) {
        if (preferredType == defaultAdapterType) {
            AgentResponse defaultResponse = getDefaultAdapter().execute(request);
            AgentResponse response = buildDirectResponse(preferredType, defaultAdapterType, defaultResponse);
            recordRouteResult(preferredType, response);
            return response;
        }

        AgentAdapter preferredAdapter = adapterMap.get(preferredType);
        if (preferredAdapter == null) {
            AgentResponse response = buildFallbackResponse(
                    preferredType,
                    "Preferred adapter is not registered in this demo build.",
                    request);
            recordRouteResult(preferredType, response);
            return response;
        }

        AgentAdapterDescriptor descriptor = preferredAdapter.describe();
        if (descriptor.status() != AgentAdapterHealthStatus.AVAILABLE) {
            AgentResponse response = buildFallbackResponse(
                    preferredType,
                    descriptor.failureReason() == null ? descriptor.description() : descriptor.failureReason(),
                    request);
            recordRouteResult(preferredType, response);
            return response;
        }

        AgentResponse preferredResponse = preferredAdapter.execute(request);
        if (preferredResponse.status() == AgentExecutionStatus.COMPLETED) {
            AgentResponse response = buildDirectResponse(preferredType, preferredType, preferredResponse);
            recordRouteResult(preferredType, response);
            return response;
        }

        String fallbackReason = preferredResponse.errorMessage();
        if (fallbackReason == null || fallbackReason.isBlank()) {
            fallbackReason = preferredResponse.content();
        }
        AgentResponse response = buildFallbackResponse(preferredType, fallbackReason, request);
        recordRouteResult(preferredType, response);
        return response;
    }

    private void recordRouteResult(AgentAdapterType preferredType, AgentResponse response) {
        Map<AgentAdapterType, AdapterRouteStats> snapshot;
        synchronized (this) {
            MutableRouteStats stats = routeStats.computeIfAbsent(preferredType, ignored -> new MutableRouteStats());
            stats.attempts.incrementAndGet();
            if (response.status() == AgentExecutionStatus.COMPLETED && !response.fallbackUsed()) {
                stats.successes.incrementAndGet();
            }
            if (response.fallbackUsed() || response.status() == AgentExecutionStatus.FALLBACK_USED) {
                stats.fallbacks.incrementAndGet();
            }
            if (response.status() == AgentExecutionStatus.FAILED) {
                stats.failures.incrementAndGet();
            }
            snapshot = snapshotRouteStats();
        }
        persistRouteStats(snapshot);
    }

    private void loadPersistedRouteStats() {
        try {
            Map<AgentAdapterType, AdapterRouteStats> persistedStats = statsRepository.load();
            synchronized (this) {
                persistedStats.forEach((adapterType, stats) ->
                        routeStats.put(adapterType, MutableRouteStats.from(stats)));
            }
        } catch (RuntimeException exception) {
            logger.warn("Failed to initialize adapter route stats from persistence. Starting with empty stats.",
                    exception);
        }
    }

    private Map<AgentAdapterType, AdapterRouteStats> snapshotRouteStats() {
        Map<AgentAdapterType, AdapterRouteStats> snapshot = new EnumMap<>(AgentAdapterType.class);
        routeStats.forEach((adapterType, stats) -> snapshot.put(adapterType, AdapterRouteStats.from(stats)));
        return Map.copyOf(snapshot);
    }

    private void persistRouteStats(Map<AgentAdapterType, AdapterRouteStats> snapshot) {
        try {
            statsRepository.save(snapshot);
        } catch (RuntimeException exception) {
            logger.warn("Adapter route stats persistence failed. Execution will continue.", exception);
        }
    }

    private AgentResponse buildDirectResponse(
            AgentAdapterType preferredType,
            AgentAdapterType actualType,
            AgentResponse response) {
        return new AgentResponse(
                response.requestId(),
                preferredType,
                actualType,
                actualType,
                false,
                response.status(),
                response.content(),
                response.producedArtifactHints(),
                response.errorMessage(),
                response.startedAt(),
                response.completedAt());
    }

    private AgentResponse buildFallbackResponse(
            AgentAdapterType preferredType,
            String reason,
            AgentRequest request) {
        AgentResponse mockResponse = getDefaultAdapter().execute(request);
        String content = "Preferred adapter " + preferredType
                + " is unavailable in this demo build. Falling back to " + defaultAdapterType + ".\n\n"
                + (reason == null ? "" : reason + "\n\n")
                + mockResponse.content();

        return new AgentResponse(
                request.requestId(),
                preferredType,
                defaultAdapterType,
                defaultAdapterType,
                true,
                AgentExecutionStatus.FALLBACK_USED,
                content,
                mockResponse.producedArtifactHints(),
                reason,
                mockResponse.startedAt() == null ? timeProvider.now() : mockResponse.startedAt(),
                timeProvider.now());
    }

    private AgentAdapterType parseAdapterType(String value) {
        try {
            return AgentAdapterType.valueOf(value.trim().toUpperCase().replace('-', '_'));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid default adapter type: " + value);
        }
    }

    private static class MutableRouteStats {
        private final AtomicLong attempts = new AtomicLong();
        private final AtomicLong successes = new AtomicLong();
        private final AtomicLong fallbacks = new AtomicLong();
        private final AtomicLong failures = new AtomicLong();

        private static MutableRouteStats from(AdapterRouteStats stats) {
            MutableRouteStats mutableStats = new MutableRouteStats();
            mutableStats.attempts.set(Math.max(0, stats.attempts()));
            mutableStats.successes.set(Math.max(0, stats.successes()));
            mutableStats.fallbacks.set(Math.max(0, stats.fallbacks()));
            mutableStats.failures.set(Math.max(0, stats.failures()));
            return mutableStats;
        }
    }

    public record AdapterRouteStats(long attempts, long successes, long fallbacks, long failures) {
        private static AdapterRouteStats empty() {
            return new AdapterRouteStats(0, 0, 0, 0);
        }

        private static AdapterRouteStats from(MutableRouteStats stats) {
            return new AdapterRouteStats(
                    stats.attempts.get(),
                    stats.successes.get(),
                    stats.fallbacks.get(),
                    stats.failures.get());
        }
    }
}

package com.agenthub.config;

import java.util.Map;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

public class PersistenceModeEnvironmentInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    private static final String PROPERTY_NAME = "agenthub.persistence.mode";
    private static final String PROPERTY_SOURCE_NAME = "agenthubPersistenceModeNormalizer";

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        ConfigurableEnvironment environment = applicationContext.getEnvironment();
        String rawMode = environment.getProperty(PROPERTY_NAME, "memory");
        String normalizedMode = rawMode == null ? "memory" : rawMode.trim().toLowerCase();
        if (normalizedMode.isBlank()) {
            normalizedMode = "memory";
        }
        environment.getPropertySources()
                .addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, Map.of(PROPERTY_NAME, normalizedMode)));
    }
}

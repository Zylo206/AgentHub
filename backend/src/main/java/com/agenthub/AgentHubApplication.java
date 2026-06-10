package com.agenthub;

import com.agenthub.config.PersistenceModeEnvironmentInitializer;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AgentHubApplication {

    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(AgentHubApplication.class);
        application.addInitializers(new PersistenceModeEnvironmentInitializer());
        application.run(args);
    }
}

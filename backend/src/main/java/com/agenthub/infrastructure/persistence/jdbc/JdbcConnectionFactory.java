package com.agenthub.infrastructure.persistence.jdbc;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "jdbc")
public class JdbcConnectionFactory {

    private final String url;
    private final String username;
    private final String password;

    public JdbcConnectionFactory(
            @Value("${agenthub.persistence.jdbc.url:}") String url,
            @Value("${agenthub.persistence.jdbc.username:}") String username,
            @Value("${agenthub.persistence.jdbc.password:}") String password) {
        if (url == null || url.isBlank()) {
            throw new IllegalStateException("agenthub.persistence.jdbc.url must be configured when persistence.mode=jdbc");
        }
        this.url = url;
        this.username = username;
        this.password = password;
    }

    public Connection open() throws SQLException {
        return DriverManager.getConnection(url, username, password);
    }
}

package com.pkm.project;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ResetController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/api/test/reset-db")
    public String resetDb() {
        jdbcTemplate.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
        return "Database reset successful. Please restart the backend to apply flyway migrations.";
    }
}

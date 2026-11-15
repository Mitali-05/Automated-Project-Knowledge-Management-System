package com.pkm.ingest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import jakarta.annotation.PreDestroy;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class ExtractionBridgeService {

    private static final Logger log = LoggerFactory.getLogger(ExtractionBridgeService.class);

    @Value("${app.extractor.python-path:}")
    private String pythonPath;

    @Value("${app.extractor.working-dir:}")
    private String workingDir;

    @Value("${app.extractor.poll-seconds:2}")
    private int pollSeconds;

    @Value("${app.extractor.auto-start:true}")
    private boolean autoStart;

    @Value("${app.ingest.service-key:}")
    private String serviceKey;

    @Value("${server.port:8081}")
    private int serverPort;

    @Value("${app.github.token:${GITHUB_TOKEN:}}")
    private String githubToken;

    @Value("${LLM1_API_KEY:${LLM_API_KEY:${app.gemini.api-key:}}}")
    private String llm1ApiKey;

    @Value("${LLM1_PROVIDER:gemini}")
    private String llm1Provider;

    @Value("${LLM1_MODEL:gemini-3.5-flash-lite}")
    private String llm1Model;

    private Process process;
    private final Object lock = new Object();

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (autoStart) {
            ensureRunning();
        }
    }

    public void triggerExtraction() {
        ensureRunning();
    }

    public void ensureRunning() {
        synchronized (lock) {
            if (process != null && process.isAlive()) {
                return;
            }

            File pythonExec = resolvePythonExecutable();
            File workDirectory = resolveWorkingDirectory();

            if (!workDirectory.exists() || !new File(workDirectory, "prism_bridge.py").exists()) {
                log.warn("Cannot start extraction bridge: prism_bridge.py not found in {}", workDirectory.getAbsolutePath());
                return;
            }

            try {
                ProcessBuilder pb = new ProcessBuilder(pythonExec.getAbsolutePath(), "prism_bridge.py");
                pb.directory(workDirectory);

                Map<String, String> env = pb.environment();
                env.put("PRISM_API_URL", "http://localhost:" + serverPort);
                if (serviceKey != null && !serviceKey.isBlank()) {
                    env.put("INGEST_SERVICE_KEY", serviceKey);
                }
                env.put("PRISM_POLL_SECONDS", String.valueOf(pollSeconds));
                if (githubToken != null && !githubToken.isBlank()) {
                    env.put("GITHUB_TOKEN", githubToken);
                    env.put("GITHUB_PERSONAL_ACCESS_TOKEN", githubToken);
                }
                if (llm1ApiKey != null && !llm1ApiKey.isBlank()) {
                    env.put("LLM1_API_KEY", llm1ApiKey);
                    env.put("LLM_API_KEY", llm1ApiKey);
                }
                if (llm1Provider != null && !llm1Provider.isBlank()) {
                    env.put("LLM1_PROVIDER", llm1Provider);
                }
                if (llm1Model != null && !llm1Model.isBlank()) {
                    env.put("LLM1_MODEL", llm1Model);
                }

                process = pb.start();
                log.info("Started PRISM extraction bridge process (PID {})", process.pid());

                Thread outThread = new Thread(() -> {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            log.info("[Extractor] {}", line);
                        }
                    } catch (IOException ignored) {
                    }
                });
                outThread.setDaemon(true);
                outThread.setName("extractor-stdout");
                outThread.start();

                Thread errThread = new Thread(() -> {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            log.warn("[Extractor-err] {}", line);
                        }
                    } catch (IOException ignored) {
                    }
                });
                errThread.setDaemon(true);
                errThread.setName("extractor-stderr");
                errThread.start();
            } catch (Exception e) {
                log.error("Failed to start PRISM extraction bridge: {}", e.getMessage(), e);
            }
        }
    }

    public boolean isRunning() {
        synchronized (lock) {
            return process != null && process.isAlive();
        }
    }

    @PreDestroy
    public void stopBridge() {
        synchronized (lock) {
            if (process != null && process.isAlive()) {
                process.destroy();
                try {
                    process.waitFor(5, TimeUnit.SECONDS);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
                if (process.isAlive()) {
                    process.destroyForcibly();
                }
                log.info("Stopped PRISM extraction bridge process.");
            }
        }
    }

    private File resolvePythonExecutable() {
        if (pythonPath != null && !pythonPath.isBlank()) {
            File custom = new File(pythonPath);
            if (custom.exists()) {
                return custom;
            }
        }

        List<String> candidates = List.of(
                "D:/Honours VII Sem/extractor-venv/Scripts/python.exe",
                "../extractor-venv/Scripts/python.exe",
                "../../extractor-venv/Scripts/python.exe",
                "extractor-venv/Scripts/python.exe"
        );

        for (String candidate : candidates) {
            File f = new File(candidate);
            if (f.exists()) {
                return f;
            }
        }

        return new File("python");
    }

    private File resolveWorkingDirectory() {
        if (workingDir != null && !workingDir.isBlank()) {
            File custom = new File(workingDir);
            if (custom.exists()) {
                return custom;
            }
        }

        List<String> candidates = List.of(
                "D:/Honours VII Sem/Automated-Project-Knowledge-Management-System/extractor",
                "../extractor",
                "../../extractor",
                "extractor"
        );

        for (String candidate : candidates) {
            File f = new File(candidate);
            if (f.exists()) {
                return f;
            }
        }

        return new File("extractor");
    }
}

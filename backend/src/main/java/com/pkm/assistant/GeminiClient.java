package com.pkm.assistant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkm.common.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.zip.GZIPInputStream;

@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);
    private static final String GEMINI_API_BASE = "https://generativelanguage.googleapis.com";
    private static final List<String> FALLBACK_MODELS = List.of(
            "gemini-3.1-flash-lite-preview",
            "gemini-flash-lite-latest",
            "gemini-3-flash-preview"
    );

    @Value("${app.gemini.api-key:}")
    private String apiKey;

    @Value("${app.gemini.model:gemini-3.8-flash}")
    private String model;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final Map<String, Instant> degradedModels = new ConcurrentHashMap<>();

    public GeminiClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(15));

        MappingJackson2HttpMessageConverter jacksonConverter = new MappingJackson2HttpMessageConverter(objectMapper);
        jacksonConverter.setSupportedMediaTypes(List.of(
                MediaType.APPLICATION_JSON,
                new MediaType("application", "*+json"),
                MediaType.APPLICATION_OCTET_STREAM,
                MediaType.ALL
        ));

        this.restClient = RestClient.builder()
                .baseUrl(GEMINI_API_BASE)
                .requestFactory(factory)
                .messageConverters(converters -> {
                    converters.add(0, new ByteArrayHttpMessageConverter());
                    converters.add(1, new StringHttpMessageConverter(StandardCharsets.UTF_8));
                    converters.add(2, jacksonConverter);
                })
                .build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String getModel() {
        return model;
    }

    public String generateResponse(String systemInstruction, String userMessage) {
        return generateResponse(systemInstruction, Collections.emptyList(), userMessage);
    }

    public String generateResponse(String systemInstruction, List<Map<String, String>> history, String userMessage) {
        if (!isConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.");
        }

        String primaryModel = normalizeModelName(model);
        Instant now = Instant.now();
        List<String> candidateModels = new ArrayList<>();
        List<String> degradedCandidates = new ArrayList<>();

        if (degradedModels.containsKey(primaryModel) && degradedModels.get(primaryModel).isAfter(now)) {
            degradedCandidates.add(primaryModel);
        } else {
            candidateModels.add(primaryModel);
        }

        for (String fb : FALLBACK_MODELS) {
            if (degradedModels.containsKey(fb) && degradedModels.get(fb).isAfter(now)) {
                if (!degradedCandidates.contains(fb)) {
                    degradedCandidates.add(fb);
                }
            } else {
                if (!candidateModels.contains(fb)) {
                    candidateModels.add(fb);
                }
            }
        }
        candidateModels.addAll(degradedCandidates);

        Exception lastException = null;
        for (String targetModel : candidateModels) {
            try {
                String result = executeGenerateContent(targetModel, systemInstruction, history, userMessage);
                if (result != null && !result.isBlank()) {
                    degradedModels.remove(targetModel);
                    return result;
                }
            } catch (ApiException e) {
                if (e.getStatus() == HttpStatus.UNAUTHORIZED) {
                    throw e;
                }
                degradedModels.put(targetModel, Instant.now().plusSeconds(600));
                lastException = e;
                log.warn("Gemini model {} request failed, trying next candidate: {}", targetModel, e.getMessage());
            } catch (Exception e) {
                degradedModels.put(targetModel, Instant.now().plusSeconds(600));
                lastException = e;
                log.warn("Gemini invocation with model {} failed: {}", targetModel, e.getMessage());
            }
        }

        if (lastException instanceof ApiException ae) {
            throw ae;
        }
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to communicate with AI Assistant: " + (lastException != null ? lastException.getMessage() : "Unknown error"));
    }

    private String executeGenerateContent(
            String targetModel,
            String systemInstruction,
            List<Map<String, String>> history,
            String userMessage) {

        String uri = "/v1beta/models/" + targetModel + ":generateContent?key=" + apiKey;

        Map<String, Object> payload = new LinkedHashMap<>();

        if (systemInstruction != null && !systemInstruction.isBlank()) {
            Map<String, Object> sysContent = Map.of("parts", List.of(Map.of("text", systemInstruction)));
            payload.put("systemInstruction", sysContent);
        }

        List<Map<String, Object>> contents = new ArrayList<>();
        if (history != null && !history.isEmpty()) {
            for (Map<String, String> item : history) {
                String role = item.getOrDefault("role", "user");
                String text = item.getOrDefault("text", "");
                if (!text.isBlank()) {
                    contents.add(Map.of(
                            "role", "assistant".equalsIgnoreCase(role) || "model".equalsIgnoreCase(role) ? "model" : "user",
                            "parts", List.of(Map.of("text", text))
                    ));
                }
            }
        }

        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", userMessage))
        ));
        payload.put("contents", contents);

        Map<String, Object> config = new LinkedHashMap<>();
        config.put("temperature", 0.2);
        config.put("maxOutputTokens", 2048);
        payload.put("generationConfig", config);

        try {
            ResponseEntity<byte[]> responseEntity = restClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON, MediaType.ALL)
                    .body(payload)
                    .retrieve()
                    .toEntity(byte[].class);

            byte[] bodyBytes = responseEntity.getBody();
            if (bodyBytes == null || bodyBytes.length == 0) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Received empty response from Gemini API.");
            }

            byte[] decompressed = decompressIfGzip(bodyBytes);
            JsonNode response = objectMapper.readTree(decompressed);

            if (response == null) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Received empty response tree from Gemini API.");
            }

            if (response.has("error")) {
                String errMsg = response.path("error").path("message").asText("Gemini error");
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Gemini API error: " + errMsg);
            }

            JsonNode candidates = response.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    StringBuilder text = new StringBuilder();
                    for (JsonNode part : parts) {
                        if (part.has("text")) {
                            text.append(part.path("text").asText(""));
                        }
                    }
                    String resStr = text.toString().trim();
                    if (!resStr.isEmpty()) {
                        return resStr;
                    }
                }
            }

            return "I couldn't find sufficient evidence in this project's indexed knowledge to answer that confidently.";
        } catch (HttpClientErrorException.TooManyRequests e) {
            log.warn("Gemini rate limit encountered for model {}: {}", targetModel, e.getMessage());
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Gemini API rate limit exceeded. Please wait a moment and try again.");
        } catch (HttpClientErrorException.Forbidden | HttpClientErrorException.Unauthorized e) {
            log.error("Gemini authentication failure: {}", e.getMessage());
            throw new ApiException(HttpStatus.UNAUTHORIZED,
                    "Invalid Gemini API key. Please verify your GEMINI_API_KEY configuration.");
        } catch (HttpClientErrorException.NotFound e) {
            log.warn("Gemini model {} not found: {}", targetModel, e.getMessage());
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Requested Gemini model '" + targetModel + "' was not found or is unavailable.");
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            log.warn("Gemini HTTP error {}: {}", e.getStatusCode(), e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Gemini API error (" + e.getStatusCode() + "): " + e.getStatusText());
        } catch (ApiException ae) {
            throw ae;
        } catch (Exception e) {
            log.warn("Gemini request execution failure for {}: {}", targetModel, e.getMessage());
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Gemini invocation failure: " + e.getMessage());
        }
    }

    public List<Double> generateEmbedding(String text) {
        if (!isConfigured() || text == null || text.isBlank()) {
            return Collections.emptyList();
        }

        String uri = "/v1beta/models/gemini-embedding-001:embedContent?key=" + apiKey;
        Map<String, Object> payload = Map.of(
                "model", "models/gemini-embedding-001",
                "content", Map.of("parts", List.of(Map.of("text", text))),
                "outputDimensionality", 768
        );

        try {
            ResponseEntity<byte[]> responseEntity = restClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON, MediaType.ALL)
                    .body(payload)
                    .retrieve()
                    .toEntity(byte[].class);

            byte[] bodyBytes = responseEntity.getBody();
            if (bodyBytes != null && bodyBytes.length > 0) {
                byte[] decompressed = decompressIfGzip(bodyBytes);
                JsonNode response = objectMapper.readTree(decompressed);
                if (response != null && response.has("embedding")) {
                    JsonNode values = response.path("embedding").path("values");
                    if (values.isArray()) {
                        List<Double> list = new ArrayList<>();
                        for (JsonNode val : values) {
                            list.add(val.asDouble());
                        }
                        return list;
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Embedding call notice: {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    private byte[] decompressIfGzip(byte[] data) {
        if (data != null && data.length >= 2 && data[0] == 0x1f && data[1] == (byte) 0x8b) {
            try (GZIPInputStream gis = new GZIPInputStream(new ByteArrayInputStream(data))) {
                return gis.readAllBytes();
            } catch (Exception e) {
                log.warn("Failed to decompress gzip stream: {}", e.getMessage());
            }
        }
        return data;
    }

    private String normalizeModelName(String modelName) {
        if (modelName == null || modelName.isBlank()) {
            return "gemini-3.1-flash-lite-preview";
        }
        return modelName.startsWith("models/") ? modelName.substring(7) : modelName;
    }
}

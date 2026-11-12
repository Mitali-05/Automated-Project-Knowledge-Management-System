package com.pkm.project;

import com.pkm.common.ApiException;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** A validated reference to a GitHub repository. */
public record GithubRepoRef(String owner, String name) {

    private static final Pattern URL = Pattern.compile(
            "^https?://(?:www\\.)?github\\.com/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))/([A-Za-z0-9._-]{1,100}?)(?:\\.git)?/?$");

    public static GithubRepoRef parse(String raw) {
        if (raw == null || raw.isBlank()) {
            throw ApiException.badRequest("Repository URL is required");
        }
        Matcher m = URL.matcher(raw.trim());
        if (!m.matches()) {
            throw ApiException.badRequest(
                    "Enter a GitHub repository URL like https://github.com/organization/repository");
        }
        return new GithubRepoRef(m.group(1), m.group(2));
    }

    public String canonicalUrl() {
        return "https://github.com/" + owner + "/" + name;
    }
}

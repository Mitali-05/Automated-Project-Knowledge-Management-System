"""
GitHub REST API client.

Auth model: expects a FINE-GRAINED personal access token
(https://github.com/settings/tokens?type=beta), scoped by the token owner to
specific repositories only, with read-only permissions on:
  - Contents
  - Pull requests
  - Metadata
  - Issues (optional, only if you also want issue comments)
"""
import base64
import re
import requests

from app.config import (
    GITHUB_API,
    MAX_SOURCE_FILES,
    MAX_FILE_BYTES,
    SOURCE_FILE_EXTENSIONS,
    SKIP_PATH_FRAGMENTS,
)


class GitHubError(Exception):
    pass


# High-priority architectural files to sample first
PRIORITY_PATTERNS = [
    "main", "app", "index", "server", "core", "config",
    "schema", "models", "router", "api", "readme"
]


class GitHubClient:
    def __init__(self, token: str):
        if not token:
            raise ValueError("A GitHub token is required (fine-grained PAT recommended).")
        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
        })

    # -- low level -----------------------------------------------------

    def _get(self, path, params=None):
        r = self.session.get(GITHUB_API + path, params=params, timeout=30)
        if r.status_code == 401:
            raise GitHubError("GitHub rejected the token (401). Check it hasn't expired or been revoked.")
        if r.status_code == 403 and "rate limit" in r.text.lower():
            raise GitHubError("GitHub API rate limit hit. Wait a bit, or use an authenticated token with a higher limit.")
        if r.status_code == 404:
            raise GitHubError(
                "404 from GitHub. Either the repo doesn't exist, or your token isn't scoped to it "
                "(for private repos, the fine-grained token must explicitly list this repository)."
            )
        if r.status_code >= 400:
            raise GitHubError(f"GitHub API {r.status_code}: {r.text[:500]}")
        return r

    def _get_json(self, path, params=None):
        return self._get(path, params).json()

    def _get_paginated(self, path, params=None, max_items=100):
        """Follows the Link header instead of trusting a single page of results."""
        items = []
        params = dict(params or {})
        params.setdefault("per_page", min(100, max_items))
        url = GITHUB_API + path
        while url and len(items) < max_items:
            r = self.session.get(url, params=params if url == GITHUB_API + path else None, timeout=30)
            if r.status_code >= 400:
                raise GitHubError(f"GitHub API {r.status_code}: {r.text[:500]}")
            page = r.json()
            if not isinstance(page, list):
                return page
            items.extend(page)
            url = r.links.get("next", {}).get("url")
        return items[:max_items]

    @staticmethod
    def parse_repo(url):
        m = re.search(r"github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?/?$", url.strip())
        if not m:
            raise ValueError("Use https://github.com/owner/repository (or owner/repository).")
        return m.group(1), m.group(2)

    # -- repo metadata ---------------------------------------------------

    def repository(self, owner, repo):
        return self._get_json(f"/repos/{owner}/{repo}")

    def commits(self, owner, repo, limit):
        return self._get_paginated(f"/repos/{owner}/{repo}/commits", {"per_page": min(limit, 100)}, max_items=limit)

    def pull_requests(self, owner, repo, limit):
        return self._get_paginated(
            f"/repos/{owner}/{repo}/pulls",
            {"state": "all", "sort": "updated", "direction": "desc"},
            max_items=limit,
        )

    def pull_request_files(self, owner, repo, number):
        return self._get_paginated(f"/repos/{owner}/{repo}/pulls/{number}/files", max_items=100)

    def pull_request_reviews(self, owner, repo, number):
        return self._get_paginated(f"/repos/{owner}/{repo}/pulls/{number}/reviews", max_items=100)

    def pull_request_comments(self, owner, repo, number):
        return self._get_paginated(f"/repos/{owner}/{repo}/issues/{number}/comments", max_items=100)

    # -- source code -----------------------------------------------------

    def repo_tree(self, owner, repo, default_branch):
        """Recursive tree of the repo at its default branch - file paths only."""
        data = self._get_json(f"/repos/{owner}/{repo}/git/trees/{default_branch}", {"recursive": "1"})
        return [
            entry for entry in data.get("tree", [])
            if entry.get("type") == "blob"
            and entry["path"].endswith(SOURCE_FILE_EXTENSIONS)
            and not any(frag in entry["path"] for frag in SKIP_PATH_FRAGMENTS)
        ]

    def file_content(self, owner, repo, path, ref=None):
        """Fetches and base64-decodes a single file's contents via the Contents API."""
        params = {"ref": ref} if ref else None
        data = self._get_json(f"/repos/{owner}/{repo}/contents/{path}", params)
        if isinstance(data, list) or data.get("type") != "file":
            return None
        if data.get("size", 0) > MAX_FILE_BYTES:
            return None
        content = data.get("content", "")
        try:
            return base64.b64decode(content).decode("utf-8", errors="replace")
        except Exception:
            return None

    def key_source_files(self, owner, repo, default_branch, max_files=MAX_SOURCE_FILES):
        """
        Picks a representative sample of source files for architecture-level extraction.
        Prioritizes entry points and core modules first before deeper tree files.
        """
        try:
            tree = self.repo_tree(owner, repo, default_branch)
        except GitHubError:
            return []

        def sort_priority(entry):
            path_lower = entry["path"].lower()
            depth = path_lower.count("/")
            # Prioritize matching core architectural keywords
            for idx, pattern in enumerate(PRIORITY_PATTERNS):
                if pattern in path_lower:
                    return (0, idx, depth, entry.get("size", 0))
            return (1, 0, depth, entry.get("size", 0))

        tree.sort(key=sort_priority)

        picked = []
        for entry in tree:
            if len(picked) >= max_files:
                break
            content = self.file_content(owner, repo, entry["path"])
            if content:
                picked.append({"path": entry["path"], "content": content})
        return picked

    # -- bundle ------------------------------------------------------------

    def build_bundle(self, repo_url, pr_limit=5, commit_limit=5, include_source=True, max_source_files=MAX_SOURCE_FILES):
        owner, repo = self.parse_repo(repo_url)
        repository = self.repository(owner, repo)
        commits = self.commits(owner, repo, commit_limit)
        prs = self.pull_requests(owner, repo, pr_limit)

        enriched = []
        for pr in prs:
            n = pr["number"]
            try:
                enriched.append({
                    "pr": pr,
                    "files": self.pull_request_files(owner, repo, n),
                    "reviews": self.pull_request_reviews(owner, repo, n),
                    "comments": self.pull_request_comments(owner, repo, n),
                })
            except GitHubError:
                enriched.append({"pr": pr, "files": [], "reviews": [], "comments": []})

        source_files = []
        if include_source:
            source_files = self.key_source_files(
                owner, repo, repository.get("default_branch", "main"), max_files=max_source_files
            )

        return {
            "repository": repository,
            "commits": commits,
            "pull_requests": enriched,
            "source_files": source_files,
        }
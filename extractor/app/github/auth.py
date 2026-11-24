import requests
import re
import os

import time
import jwt

def get_github_app_jwt(app_id: str, private_key_path: str) -> str:
    with open(private_key_path, 'r') as f:
        private_key = f.read()

    payload = {
        'iat': int(time.time()),
        'exp': int(time.time()) + (10 * 60),
        'iss': app_id
    }
    return jwt.encode(payload, private_key, algorithm='RS256')

def get_installation_access_token(app_id: str, private_key_path: str, installation_id: str) -> str:
    jwt_token = get_github_app_jwt(app_id, private_key_path)
    
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {jwt_token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    
    url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
    response = requests.post(url, headers=headers)
    if response.status_code == 201:
        return response.json()["token"]
    else:
        raise Exception(f"Failed to get installation token: {response.status_code} - {response.text}")

def fetch_installation_repos(installation_token: str):
    url = "https://api.github.com/installation/repositories"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {installation_token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    params = {"per_page": 100}
    response = requests.get(url, headers=headers, params=params, timeout=30)
    response.raise_for_status()
    return response.json()["repositories"]


def parse_repo_url(url: str):
    m = re.search(r"github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?/?$", url.strip())
    if not m:
        raise ValueError("Invalid URL. Use https://github.com/owner/repository")
    return m.group(1), m.group(2)

class GitHubRateLimitError(RuntimeError):
    """GitHub denied the request because the API quota was exhausted."""


def raise_for_github_status(response):
    if response.status_code in (403, 429) and (
        response.status_code == 429 or response.headers.get('X-RateLimit-Remaining') == '0'
        or response.headers.get('Retry-After') or 'rate limit' in response.text.lower()
    ):
        raise GitHubRateLimitError('GitHub API rate limit reached. Configure a public-only GITHUB_TOKEN or connect the PRISM GitHub App, then retry when the limit resets.')
    response.raise_for_status()


def fetch_repo_tree(token: str | None, owner: str, repo: str) -> list:
    """Resolve the real default branch; propagate HTTP and parsing failures."""
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    credential = token or os.getenv('GITHUB_TOKEN', '').strip()
    if credential:
        headers["Authorization"] = f"Bearer {credential}"
    base = f"https://api.github.com/repos/{owner}/{repo}"
    metadata = requests.get(base, headers=headers, timeout=30)
    raise_for_github_status(metadata)
    details = metadata.json()
    if not token and details.get("private") is not False:
        raise RuntimeError("Repository is not confirmed public. Connect GitHub for private access.")
    branch = details["default_branch"]
    from urllib.parse import quote
    response = requests.get(f"{base}/git/trees/{quote(branch, safe='')}?recursive=1", headers=headers, timeout=30)
    raise_for_github_status(response)
    data = response.json()
    if data.get("truncated"):
        raise RuntimeError("Repository tree is truncated; complete extraction cannot be verified")
    tree = data["tree"]
    if not tree:
        raise RuntimeError("Repository tree is empty")
    return tree


def check_repo_access(token: str, owner: str, repo: str) -> tuple[bool, str]:
    """Checks whether the target repository is accessible, public, or private."""
    url = f"https://api.github.com/repos/{owner}/{repo}"
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token and token.strip() and token.strip() != "__NONE__":
        headers["Authorization"] = f"Bearer {token.strip()}"
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            is_private = data.get("private", False)
            return True, f"Repository accessible ({'private' if is_private else 'public'})."
        elif r.status_code == 404:
            return False, "Repository not found or access denied. If this is a private repository, please authorize access via 'Connect GitHub'."
        elif r.status_code in (401, 403):
            return False, "Access forbidden or rate limited. Please authorize access via 'Connect GitHub'."
        return False, f"GitHub API returned HTTP {r.status_code}."
    except Exception as e:
        return False, f"Could not reach GitHub API: {str(e)}"

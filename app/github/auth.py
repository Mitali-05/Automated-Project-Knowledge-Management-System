import requests
import re

def fetch_user_repos(token: str, repo_type="private"):
    url = "https://api.github.com/user/repos"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    params = {"type": repo_type, "sort": "updated", "per_page": 100}
    try:
        r = requests.get(url, headers=headers, params=params)
        if r.status_code == 200:
            return r.json()
        return []
    except Exception:
        return []

def parse_repo_url(url: str):
    m = re.search(r"github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?/?$", url.strip())
    if not m:
        raise ValueError("Invalid URL. Use https://github.com/owner/repository")
    return m.group(1), m.group(2)

def fetch_repo_tree(token: str, owner: str, repo: str) -> list:
    """Fetches the repository file tree structure."""
    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/main?recursive=1"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            return r.json().get("tree", [])
        # Fallback to master if main doesn't exist
        url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/master?recursive=1"
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            return r.json().get("tree", [])
        return []
    except Exception:
        return []

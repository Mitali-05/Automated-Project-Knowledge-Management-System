import requests
import re

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
    try:
        r = requests.get(url, headers=headers, params=params)
        if r.status_code == 200:
            return r.json().get("repositories", [])
        else:
            print(f"Failed to fetch installation repos: {r.status_code} - {r.text}")
            return []
    except Exception as e:
        print(f"Exception fetching repos: {e}")
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

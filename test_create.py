import requests

def test_create_project():
    session = requests.Session()
    # 1. Login
    login_url = "http://localhost:8081/api/auth/login"
    login_data = {
        "email": "mudgalua@rknec.edu",
        "password": "Purvank123@"
    }
    
    print("Logging in...")
    resp = session.post(login_url, json=login_data)
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} {resp.text}")
        return
    
    token = resp.json().get("token")
    print(f"Logged in, token: {token[:10]}...")
    
    # 2. Create project
    create_url = "http://localhost:8081/api/projects"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    create_data = {
        "name": "Test Project",
        "description": "Test",
        "urls": ["https://github.com/UtkarshMudgal2802droid/buy-me-a-coffee"],
        "isPublic": True
    }
    
    print("Creating project...")
    resp = session.post(create_url, headers=headers, json=create_data)
    print(f"Create project status: {resp.status_code}")
    print(f"Response: {resp.text}")

if __name__ == "__main__":
    test_create_project()

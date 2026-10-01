import sys
import os
import requests
import asyncio
from pathlib import Path
import streamlit as st

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.llm_client import LLMClient, LLMError, default_provider
from app.core.config import LLM_PROVIDERS, MAX_INPUT_TOKENS_PER_BATCH
from app.utils.exporter import generate_pdf_report
from app.mcp.service import GitHubMCPClientService
from app.mcp.agent import run_autonomous_extraction
from app.github.auth import fetch_user_repos, parse_repo_url, fetch_repo_tree

st.set_page_config(page_title="GitHub Knowledge Extraction", page_icon="🧠", layout="wide")

st.title("🧠 GitHub Knowledge Extraction — Agentic MCP Prototype")
st.caption("LLM Autonomously explores GitHub via Model Context Protocol tools.")

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")

if "github_token" not in st.session_state:
    st.session_state.github_token = None

# Handle OAuth callback
if "code" in st.query_params and not st.session_state.github_token:
    code = st.query_params["code"]
    
    if GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET:
        with st.spinner("Authenticating with GitHub..."):
            response = requests.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": code,
                },
                headers={"Accept": "application/json"}
            )
            
            if response.status_code == 200 and "access_token" in response.json():
                st.session_state.github_token = response.json()["access_token"]
                st.query_params.clear()
                st.rerun()
            else:
                st.error("Failed to authenticate with GitHub.")
    else:
        st.error("OAuth configuration missing! Please add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to your .env file.")

with st.sidebar:
    st.header("Configuration")
    
    if not st.session_state.github_token:
        st.warning("Please login to GitHub to continue.")
        if GITHUB_CLIENT_ID:
            auth_url = f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&scope=repo"
            st.markdown(
                f'<a href="{auth_url}" target="_self">'
                f'<button style="width: 100%; padding: 0.5rem; background-color: #2ea043; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">'
                f'Login with GitHub</button></a>',
                unsafe_allow_html=True
            )
        else:
            st.error("GITHUB_CLIENT_ID is not set in .env")
        github_token = None
    else:
        st.success("✅ Logged in to GitHub")
        if st.button("Logout", use_container_width=True):
            st.session_state.github_token = None
            st.rerun()
        github_token = st.session_state.github_token

    st.divider()

    provider = st.selectbox(
        "LLM provider",
        options=list(LLM_PROVIDERS.keys()),
        index=list(LLM_PROVIDERS.keys()).index(default_provider()),
        format_func=lambda p: p,
    )
    st.caption(LLM_PROVIDERS[provider]["notes"])
    llm_key = os.getenv("LLM_API_KEY")

st.subheader("Repository Selection")
repo_visibility = st.radio("Repository Type", ["Public", "Private"], horizontal=True)

repo_url = ""
if repo_visibility == "Public":
    repo_url = st.text_input("Public Repository URL", placeholder="https://github.com/owner/repository")
else:
    if st.session_state.github_token:
        with st.spinner("Fetching your private repositories..."):
            private_repos = fetch_user_repos(st.session_state.github_token, repo_type="private")
        if not private_repos:
            st.warning("No private repositories found or your app doesn't have access to them.")
        else:
            repo_options = {repo["full_name"]: repo["html_url"] for repo in private_repos}
            selected_repo = st.selectbox("Select Private Repository", options=list(repo_options.keys()))
            if selected_repo:
                repo_url = repo_options[selected_repo]
            
            st.markdown(
                """<a href="https://github.com/apps/prism-knowledge-manager/installations/new" target="_blank" style="font-size: 0.9em; text-decoration: none;">⚙️ Can't find your repository? Click here to add it.</a>""", 
                unsafe_allow_html=True
            )
    else:
        st.warning("Please log in to GitHub in the sidebar to view private repositories.")

if st.button("🔍 Analyze Repository Agentically", type="primary", use_container_width=True):

    if not repo_url:
        st.error("Please enter a GitHub repository URL.")
        st.stop()
    if not github_token:
        st.error("Please log in to GitHub using the sidebar.")
        st.stop()
    if not llm_key:
        st.error("The server's LLM API key is not configured.")
        st.stop()

    try:
        owner, repo = parse_repo_url(repo_url)
    except ValueError as e:
        st.error(str(e))
        st.stop()

    # --- Display Repository File Tree ---
    with st.expander("📁 Repository File Structure", expanded=False):
        st.markdown(f"Fetching tree for `{owner}/{repo}`...")
        tree = fetch_repo_tree(github_token, owner, repo)
        if tree:
            for item in tree:
                icon = "📁" if item.get("type") == "tree" else "📄"
                st.text(f"{icon} {item.get('path')}")
        else:
            st.warning("Could not fetch file tree.")

    try:
        llm_client = LLMClient(provider, llm_key)
        
        with st.spinner(f"Agent is autonomously exploring {owner}/{repo}... (This may take a minute)"):
            
            # Create a new event loop for this async call if needed
            async def execute_agent():
                service = GitHubMCPClientService(access_token=github_token)
                async with service.connect() as session:
                    return await run_autonomous_extraction(owner, repo, llm_client, session)
            
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            items, executed_tools = loop.run_until_complete(execute_agent())

        st.success(f"Agent finished! It called these MCP tools: {', '.join(executed_tools) if executed_tools else 'None'}")

        st.subheader(f"🧠 Extracted Knowledge ({len(items)})")

        if not items:
            st.warning("No meaningful organizational knowledge was extracted.")
            st.stop()

        for i, item in enumerate(items, start=1):
            with st.container(border=True):
                st.markdown(f"## {i}. {item.title}")
                col1, col2, col3 = st.columns(3)
                col1.write(f"**Type:** {item.knowledge_type}")
                col2.write(f"**Module:** {item.module or 'Not determined'}")
                col3.write(f"**Confidence:** {item.confidence:.0%}")

                st.markdown("### Summary")
                st.write(item.summary)

                if item.details:
                    st.markdown("### Details")
                    st.write(item.details)
                    
                st.markdown("### 🔎 Cross-Verification Evidence")
                if not item.evidence_ids:
                    st.warning("The agent did not provide direct evidence for this item.")
                else:
                    for ev in item.evidence_ids:
                        # Create a clickable GitHub link if it looks like a file path
                        if "/" in ev or "." in ev:
                            st.markdown(f"- [View `{ev}` on GitHub](https://github.com/{owner}/{repo}/blob/main/{ev})")
                        else:
                            st.markdown(f"- `{ev}`")
                            
        # --- Generate File Exports ---
        try:
            raw_file_path = "raw_knowledge.json"
            formatted_file_path = "formatted_report.md"
            
            # 1. Write Raw Knowledge JSON
            with open(raw_file_path, "w", encoding="utf-8") as f:
                import json
                raw_data = [item.model_dump() for item in items]
                json.dump(raw_data, f, indent=4)
                
            # 2. Write Formatted Report Markdown
            with open(formatted_file_path, "w", encoding="utf-8") as f:
                f.write(f"# Knowledge Extraction Report for {owner}/{repo}\\n\\n")
                f.write("This document contains the formatted knowledge extracted by the autonomous agent.\\n\\n")
                for i, item in enumerate(items, start=1):
                    f.write(f"## {i}. {item.title}\\n")
                    f.write(f"- **Type:** {item.knowledge_type}\\n")
                    f.write(f"- **Module:** {item.module or 'Not determined'}\\n")
                    f.write(f"- **Confidence:** {item.confidence * 100:.0f}% (Agent Self-Assessment)\\n\\n")
                    f.write(f"### Summary\\n{item.summary}\\n\\n")
                    if item.details:
                        f.write(f"### Details\\n{item.details}\\n\\n")
                    if item.evidence_ids:
                        f.write("### Evidence\\n")
                        for ev in item.evidence_ids:
                            f.write(f"- `{ev}`\\n")
                    f.write("\\n---\\n\\n")
                    
            st.success(f"💾 Files generated successfully! Check your project folder for `raw_knowledge.json` and `formatted_report.md`.")
        except Exception as file_e:
            st.warning(f"Could not write output files: {file_e}")

    except Exception as e:
        st.error("An error occurred during agentic extraction.")
        st.exception(e)

else:
    st.info(
        "Enter a repository URL and click **Analyze Repository**. The LLM will now autonomously "
        "use MCP tools to search the code, read files, and extract knowledge without downloading "
        "the entire repository upfront."
    )

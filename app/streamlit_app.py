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
from app.github.auth import fetch_installation_repos, get_installation_access_token, parse_repo_url, fetch_repo_tree

from dotenv import load_dotenv
load_dotenv(override=True)

st.set_page_config(page_title="GitHub Knowledge Extraction", layout="wide")

st.title("GitHub Knowledge Extraction — Agentic MCP Prototype")
st.caption("LLM Autonomously explores GitHub via Model Context Protocol tools.")

GITHUB_APP_ID = os.getenv("GITHUB_APP_ID")
GITHUB_APP_NAME = os.getenv("GITHUB_APP_NAME")
GITHUB_INSTALLATION_ID = os.getenv("GITHUB_INSTALLATION_ID")

# Find the private key file dynamically
pem_files = list(Path(__file__).parent.parent.glob("*.pem"))
PRIVATE_KEY_PATH = str(pem_files[0]) if pem_files else None

if "github_token" not in st.session_state:
    st.session_state.github_token = None
if "installation_id" not in st.session_state:
    st.session_state.installation_id = None

# Automatically log in using the hardcoded installation ID if available
if not st.session_state.github_token and GITHUB_INSTALLATION_ID:
    st.session_state.installation_id = GITHUB_INSTALLATION_ID

# Handle GitHub App installation callback (or .env injection)
if st.session_state.installation_id and not st.session_state.github_token:
    
    if GITHUB_APP_ID and PRIVATE_KEY_PATH:
        with st.spinner("Authenticating with GitHub App..."):
            try:
                token = get_installation_access_token(GITHUB_APP_ID, PRIVATE_KEY_PATH, st.session_state.installation_id)
                st.session_state.github_token = token
                st.query_params.clear()
                st.rerun()
            except Exception as e:
                st.error(f"Failed to authenticate: {e}")
    else:
        st.error("Missing GITHUB_APP_ID in .env or missing .pem file!")

# If the user clicked from a new installation, grab it from URL
if "installation_id" in st.query_params and not st.session_state.installation_id:
    st.session_state.installation_id = st.query_params["installation_id"]
    st.rerun()

with st.sidebar:
    st.header("Configuration")


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

tab1, tab2 = st.tabs(["Select Authorized Repository", "Paste Public Repository URL"])

repo_url = ""

with tab1:
    if st.session_state.github_token:
        with st.spinner("Fetching your authorized repositories..."):
            all_repos = fetch_installation_repos(st.session_state.github_token)
            private_repos = [repo for repo in all_repos if repo.get("private") == True]
        if not private_repos:
            st.warning("No private repositories found or your app doesn't have access to them.")
            st.info("Click 'Select Repositories' below to add them.")
        else:
            repo_options = {repo["full_name"]: repo["html_url"] for repo in private_repos}
            selected_repo = st.selectbox("Choose a repository", options=list(repo_options.keys()))
            if selected_repo:
                repo_url = repo_options[selected_repo]
            
        st.write("")
        col1, col2 = st.columns([1, 1])
        with col1:
            if GITHUB_APP_NAME:
                auth_url = f"https://github.com/apps/{GITHUB_APP_NAME}/installations/new"
                st.markdown(f'<a href="{auth_url}" target="_self"><button style="width: 100%; padding: 0.5rem; background-color: #2ea043; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Add More Repositories</button></a>', unsafe_allow_html=True)
        with col2:
            if st.button("Logout / Disconnect", use_container_width=True):
                st.session_state.github_token = None
                st.session_state.installation_id = None
                st.rerun()
    else:
        st.info("Authorize the app to select from your private repositories.")
        if GITHUB_APP_NAME:
            auth_url = f"https://github.com/apps/{GITHUB_APP_NAME}/installations/new"
            st.markdown(
                f'<a href="{auth_url}" target="_self">'
                f'<button style="width: 100%; padding: 0.5rem; background-color: #2ea043; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">'
                f'Select Repositories</button></a>',
                unsafe_allow_html=True
            )
        else:
            st.error("GITHUB_APP_NAME is not set in .env")

with tab2:
    st.info("No login required. Just paste any public GitHub URL.")
    public_url_input = st.text_input("Public Repository URL", placeholder="https://github.com/owner/repository")
    if public_url_input:
        repo_url = public_url_input

st.write("")
if st.button("Analyze Repository Agentically", type="primary", use_container_width=True):

    if not repo_url:
        st.error("Please select a repository or enter a public URL.")
        st.stop()
    
    # If using the authorized tab, github_token is required. If using public tab, it's not strictly required but we use it if available.
    if not public_url_input and not st.session_state.github_token:
        st.error("Please authorize the app to analyze private repositories.")
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
    with st.expander("Repository File Structure", expanded=False):
        st.markdown(f"Fetching tree for `{owner}/{repo}`...")
        tree = fetch_repo_tree(st.session_state.github_token, owner, repo)
        if tree:
            for item in tree:
                icon = "[Folder]" if item.get("type") == "tree" else "[File]"
                st.text(f"{icon} {item.get('path')}")
        else:
            st.warning("Could not fetch file tree.")

    try:
        llm_client = LLMClient(provider, llm_key)
        
        with st.spinner(f"Agent is autonomously exploring {owner}/{repo}... (This may take a minute)"):
            
            # Create a new event loop for this async call if needed
            async def execute_agent():
                service = GitHubMCPClientService(access_token=st.session_state.github_token)
                async with service.connect() as session:
                    return await run_autonomous_extraction(owner, repo, llm_client, session)
            
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            items, executed_tools, problem_statement, tech_stack = loop.run_until_complete(execute_agent())

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
                f.write(f"# Software Architecture & Knowledge Document: {owner}/{repo}\n\n")
                f.write("> *Generated Autonomously by PRISM Agentic Extraction*\n\n")
                
                f.write("## 1. Executive Summary & Problem Statement\n")
                f.write(f"{problem_statement}\n\n")
                
                f.write("## 2. Technology Stack\n")
                if tech_stack:
                    for tech in tech_stack:
                        f.write(f"- {tech}\n")
                else:
                    f.write("*Tech stack could not be determined.*\n")
                f.write("\n")
                
                f.write("## 3. Repository Structure\n")
                f.write("```text\n")
                if tree:
                    for item in tree[:200]: 
                        icon = "[DIR] " if item.get("type") == "tree" else "[FILE]"
                        f.write(f"{icon} {item.get('path')}\n")
                    if len(tree) > 200:
                        f.write("... (truncated)\n")
                else:
                    f.write("Structure unavailable.\n")
                f.write("```\n\n")
                
                f.write("## 4. Technical Architecture & Component Knowledge\n\n")
                
                # Group by knowledge_type
                from collections import defaultdict
                grouped_items = defaultdict(list)
                for item in items:
                    grouped_items[item.knowledge_type].append(item)
                    
                for ktype, kitems in grouped_items.items():
                    f.write(f"### Domain: {ktype.replace('_', ' ').title()}\n\n")
                    for item in kitems:
                        f.write(f"#### {item.title}\n")
                        f.write(f"- **Affected Module:** `{item.module or 'Global/System-wide'}`\n")
                        f.write(f"- **AI Confidence Score:** {item.confidence * 100:.0f}%\n\n")
                        f.write(f"**Executive Summary:**\n{item.summary}\n\n")
                        if item.details:
                            f.write(f"**Implementation Details & Context:**\n{item.details}\n\n")
                        if item.evidence_ids:
                            f.write("**Traceability & Evidence (Code Pointers):**\n")
                            for ev in item.evidence_ids:
                                f.write(f"- `{ev}`\n")
                        f.write("\n---\n\n")
                        
            st.success(f"💾 Files generated successfully! Check your project folder for `raw_knowledge.json` and `formatted_report.md`.")
            
            # --- Vector DB Insertion ---
            with st.spinner("Pushing semantic knowledge to AWS Aurora Vector Database..."):
                try:
                    from app.core.db import VectorDatabase
                    db = VectorDatabase()
                    db.initialize_schema()
                    
                    for item in items:
                        # Create embedding from the summary
                        embed_text = f"Title: {item.title}\nSummary: {item.summary}\nModule: {item.module}"
                        vector = llm_client.embed_text(embed_text)
                        
                        db.insert_knowledge(
                            repository_name=f"{owner}/{repo}",
                            knowledge_type=item.knowledge_type,
                            title=item.title,
                            summary=item.summary,
                            details=item.details or "",
                            evidence=",".join(item.evidence_ids) if item.evidence_ids else "",
                            embedding=vector
                        )
                    st.success("✅ Semantic knowledge successfully embedded and stored in AWS Aurora!")
                except Exception as e:
                    st.error(f"Failed to push to AWS Database: {e}")
                    
            st.write("")
            col1, col2 = st.columns(2)
            with col1:
                with open(formatted_file_path, "r", encoding="utf-8") as f:
                    md_data = f.read()
                st.download_button(
                    label="Download Markdown Report",
                    data=md_data,
                    file_name=f"{repo}_knowledge_report.md",
                    mime="text/markdown",
                    use_container_width=True
                )
            with col2:
                with open(raw_file_path, "r", encoding="utf-8") as f:
                    json_data = f.read()
                st.download_button(
                    label="Download Raw JSON Data",
                    data=json_data,
                    file_name=f"{repo}_raw_knowledge.json",
                    mime="application/json",
                    use_container_width=True
                )
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

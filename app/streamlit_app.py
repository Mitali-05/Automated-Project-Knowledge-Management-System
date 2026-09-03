import sys
from pathlib import Path

import streamlit as st

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.github_client import GitHubClient, GitHubError
from app.llm_client import LLMClient, LLMError, default_provider
from app.extractor import extract_knowledge
from app.config import LLM_PROVIDERS, MAX_INPUT_TOKENS_PER_BATCH, MAX_SOURCE_FILES

from app.exporter import generate_pdf_report

st.set_page_config(page_title="GitHub Knowledge Extraction", page_icon="🧠", layout="wide")

st.title("🧠 GitHub Knowledge Extraction — Phase 2/3 Prototype")
st.caption("GitHub activity + source code → evidence → LLM (batched) → structured, cited knowledge")

with st.sidebar:
    st.header("Configuration")

    github_token = st.text_input(
        "GitHub fine-grained PAT",
        type="password",
        help=(
            "Create at github.com/settings/tokens?type=beta. Scope it to ONLY the repo(s) "
            "you're testing, with read-only: Contents, Pull requests, Metadata."
        ),
    )

    provider = st.selectbox(
        "LLM provider",
        options=list(LLM_PROVIDERS.keys()),
        index=list(LLM_PROVIDERS.keys()).index(default_provider()),
        format_func=lambda p: p,
    )
    st.caption(LLM_PROVIDERS[provider]["notes"])

    llm_key = st.text_input(
        "LLM API key",
        type="password",
        help="Gemini keys: aistudio.google.com/apikey. Groq keys: console.groq.com/keys.",
    )

    st.divider()
    pr_limit = st.slider("Number of PRs", 1, 15, 5)
    commit_limit = st.slider("Number of commits", 1, 20, 5)
    include_source = st.checkbox("Also fetch source files (for architecture-level knowledge)", value=True)
    max_source_files = st.slider("Max source files to fetch", 1, 30, MAX_SOURCE_FILES, disabled=not include_source)

    st.divider()
    st.caption(f"Each LLM call is capped at ~{MAX_INPUT_TOKENS_PER_BATCH} input tokens; larger repos "
               f"are split into multiple batched calls automatically.")

repo_url = st.text_input("GitHub repository URL", placeholder="https://github.com/owner/repository")

if st.button("🔍 Analyze Repository", type="primary", use_container_width=True):

    if not repo_url:
        st.error("Please enter a GitHub repository URL.")
        st.stop()
    if not github_token:
        st.error("Please enter your GitHub fine-grained PAT.")
        st.stop()
    if not llm_key:
        st.error("Please enter your LLM API key.")
        st.stop()

    try:
        with st.spinner("Fetching GitHub activity and source files..."):
            github_client = GitHubClient(github_token)
            bundle = github_client.build_bundle(
                repo_url, pr_limit, commit_limit,
                include_source=include_source, max_source_files=max_source_files,
            )

        repo = bundle["repository"]
        st.success(
            f"Fetched {len(bundle['pull_requests'])} PRs, {len(bundle['commits'])} commits, "
            f"and {len(bundle['source_files'])} source files from {repo['full_name']} "
            f"({'private' if repo.get('private') else 'public'})."
        )

        with st.expander("📦 Raw GitHub Evidence"):
            st.write(f"**Repository:** {repo['full_name']}")
            st.write(f"**Description:** {repo.get('description') or 'No description'}")
            st.divider()

            st.subheader("Pull Requests")
            if not bundle["pull_requests"]:
                st.info(
                    "No pull requests were found. If this repo's history is all direct commits to "
                    "main, extraction will lean entirely on commit messages and source files — "
                    "expect fewer TECHNICAL_DECISION items, since those usually need PR/review "
                    "discussion to explain the *why*."
                )
            for x in bundle["pull_requests"]:
                p = x["pr"]
                st.markdown(f"### PR #{p['number']} — {p.get('title', 'Untitled')}")
                st.write(p.get("body") or "No description provided.")
                st.write(f"Files: {len(x['files'])} | Reviews: {len(x['reviews'])} | Comments: {len(x['comments'])}")
                st.divider()

            if bundle["source_files"]:
                st.subheader("Source Files Sampled")
                for f in bundle["source_files"]:
                    st.write(f"`{f['path']}` — {len(f['content'])} bytes")

        with st.spinner("Extracting knowledge (may run several batched LLM calls on larger repos)..."):
            llm_client = LLMClient(provider, llm_key)
            items, evidence, batch_count = extract_knowledge(bundle, llm_client)

        st.subheader(f"🧠 Extracted Knowledge ({len(items)}) — {batch_count} LLM batch(es)")

        if not items:
            st.warning("No meaningful organizational knowledge was extracted from the selected activity.")
            st.stop()

        evidence_map = {e["id"]: e for e in evidence}

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

                st.markdown("### 🔎 Evidence")
                if not item.evidence_ids:
                    st.warning("This knowledge item has no linked evidence.")
                else:
                    for evidence_id in item.evidence_ids:
                        e = evidence_map.get(evidence_id)
                        if not e:
                            st.warning(f"Evidence `{evidence_id}` was referenced but could not be found.")
                            continue
                        st.markdown(f"**{e.get('source_type', 'SOURCE')}** — {e.get('title', 'Untitled')}")
                        if e.get("excerpt"):
                            st.caption(e["excerpt"])
                        if e.get("url"):
                            st.markdown(f"[🔗 Open on GitHub]({e['url']})")
                        st.divider()

    except (GitHubError, LLMError, ValueError) as e:
        st.error(str(e))
    except Exception as e:
        st.error("An unexpected error occurred.")
        st.exception(e)

else:
    st.info(
        "Enter a repository URL and click **Analyze Repository**. Works on private repos too, "
        "as long as your fine-grained PAT is scoped to them. A repo with real PR descriptions "
        "and reviews (not just bare commits) gives the richer demo."
    )



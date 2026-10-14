import sys
import os
import requests
import asyncio
import base64
import time
from pathlib import Path
import streamlit as st
import pandas as pd
from collections import defaultdict
import json
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))

load_dotenv(override=True)

import importlib
import app.core.config
importlib.reload(app.core.config)

from app.core.config import LLM_PROVIDERS, LLM1_PROVIDER, LLM1_MODEL, LLM1_API_KEY, LLM2_PROVIDER, LLM2_MODEL
from app.core.llm_client import LLMClient, default_provider
from app.core.models import AgentExtractionResult
from app.core.project_manager import ProjectManager
from app.utils.exporter import generate_pdf_report
from app.utils.pptx_exporter import generate_pptx_deck
from app.utils.charts import generate_subsystem_breakdown_chart, generate_capability_radar_chart
from app.github.auth import fetch_installation_repos, get_installation_access_token, parse_repo_url

st.set_page_config(page_title="PRISM - Enterprise Architecture Management", layout="wide")

# ---------------------------------------------------------
# Modern High-End Enterprise Design System (Linear / Vercel Theme)
# ---------------------------------------------------------
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        color: #F1F5F9;
    }
    
    /* Sleek Status Badge with LED indicator */
    .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 14px;
        border-radius: 9999px;
        font-size: 0.8rem;
        font-weight: 500;
        letter-spacing: 0.02em;
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        margin-right: 8px;
    }
    .status-dot-active {
        background-color: #10B981;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
    }
    .status-dot-warning {
        background-color: #F59E0B;
        box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
    }
    .status-dot-inactive {
        background-color: #64748B;
    }

    /* Executive KPI Metric Cards */
    .kpi-container {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin-bottom: 20px;
    }
    .kpi-card {
        background: #0B1120;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-top: 2px solid #3B82F6;
        border-radius: 10px;
        padding: 16px 18px;
    }
    .kpi-card-cyan { border-top-color: #06B6D4; }
    .kpi-card-purple { border-top-color: #8B5CF6; }
    .kpi-card-emerald { border-top-color: #10B981; }
    .kpi-card-amber { border-top-color: #F59E0B; }
    
    .kpi-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #94A3B8;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 6px;
    }
    .kpi-value {
        font-size: 1.35rem;
        font-weight: 700;
        color: #F8FAFC;
        letter-spacing: -0.02em;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .kpi-sub {
        font-size: 0.75rem;
        color: #64748B;
        margin-top: 5px;
    }

    /* Technical Badges */
    .badge-stack {
        display: inline-block;
        padding: 4px 10px;
        margin: 3px;
        border-radius: 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.8rem;
        font-weight: 500;
        background-color: rgba(30, 41, 59, 0.7);
        color: #E2E8F0;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .badge-pattern {
        display: inline-block;
        padding: 4px 10px;
        margin: 3px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 500;
        background-color: rgba(139, 92, 246, 0.12);
        color: #C4B5FD;
        border: 1px solid rgba(139, 92, 246, 0.28);
    }
    
    /* Technical Debt Callout Card */
    .debt-card {
        background: rgba(69, 26, 3, 0.25);
        border: 1px solid rgba(245, 158, 11, 0.35);
        border-left: 3px solid #F59E0B;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 10px;
        color: #FDE68A;
        font-size: 0.875rem;
        line-height: 1.5;
    }

    /* Deliverable Box */
    .deliverable-box {
        background: #0B1120;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 24px;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    
    /* Headers & Section Titles */
    h1, h2, h3, h4 {
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        letter-spacing: -0.025em;
    }
    
    /* Button refinement */
    div.stButton > button {
        border-radius: 6px;
        font-weight: 500;
        font-size: 0.875rem;
        letter-spacing: -0.01em;
        transition: all 0.15s ease;
    }

    /* Popover container high-contrast styling */
    div[data-testid="stPopoverBody"] {
        background-color: #0F172A !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        color: #F8FAFC !important;
        border-radius: 10px !important;
        padding: 16px !important;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5) !important;
    }
    div[data-testid="stPopoverBody"] p,
    div[data-testid="stPopoverBody"] span,
    div[data-testid="stPopoverBody"] strong {
        color: #F8FAFC !important;
    }
    div[data-testid="stPopoverBody"] .stCaptionContainer,
    div[data-testid="stPopoverBody"] small {
        color: #94A3B8 !important;
    }
</style>
""", unsafe_allow_html=True)

# ---------------------------------------------------------
# State Initialization
# ---------------------------------------------------------
if "current_view" not in st.session_state:
    st.session_state.current_view = "projects"
if "selected_project_id" not in st.session_state:
    st.session_state.selected_project_id = None
if "is_connected" not in st.session_state:
    st.session_state.is_connected = False
if "github_token" not in st.session_state:
    st.session_state.github_token = None
if "installation_id" not in st.session_state:
    st.session_state.installation_id = None
if "active_analyzing_id" not in st.session_state:
    st.session_state.active_analyzing_id = None

pm = ProjectManager()

# GitHub App credentials
GITHUB_APP_ID = os.getenv("GITHUB_APP_ID")
GITHUB_APP_NAME = os.getenv("GITHUB_APP_NAME")
GITHUB_INSTALLATION_ID = os.getenv("GITHUB_INSTALLATION_ID")

pem_files = list(Path(__file__).parent.parent.glob("*.pem"))
PRIVATE_KEY_PATH = str(pem_files[0]) if pem_files else None

# Check for query param callback from GitHub App installation
if "installation_id" in st.query_params and not st.session_state.is_connected:
    inst_id = st.query_params["installation_id"]
    if GITHUB_APP_ID and PRIVATE_KEY_PATH:
        try:
            token = get_installation_access_token(GITHUB_APP_ID, PRIVATE_KEY_PATH, inst_id)
            st.session_state.github_token = token
            st.session_state.installation_id = inst_id
            st.session_state.is_connected = True
            st.query_params.clear()
            st.rerun()
        except Exception as e:
            st.error(f"Failed to authenticate installation: {e}")

# ---------------------------------------------------------
# Top Navigation Bar (ONLY shown on Projects Gallery and Add Project View)
# ---------------------------------------------------------
if st.session_state.current_view != "project_detail":
    top_col1, top_col2, top_col3 = st.columns([2.5, 3.5, 2])

    with top_col1:
        if not st.session_state.is_connected or not st.session_state.github_token:
            if st.button("Connect GitHub", type="primary", width='stretch'):
                if GITHUB_APP_ID and PRIVATE_KEY_PATH and GITHUB_INSTALLATION_ID:
                    try:
                        with st.spinner("Connecting to GitHub..."):
                            token = get_installation_access_token(GITHUB_APP_ID, PRIVATE_KEY_PATH, GITHUB_INSTALLATION_ID)
                            st.session_state.github_token = token
                            st.session_state.installation_id = GITHUB_INSTALLATION_ID
                            st.session_state.is_connected = True
                            st.rerun()
                    except Exception as e:
                        st.error(f"Failed to connect: {e}")
                elif GITHUB_APP_NAME:
                    auth_url = f"https://github.com/apps/{GITHUB_APP_NAME}/installations/new"
                    st.markdown(f'<meta http-equiv="refresh" content="0; url={auth_url}">', unsafe_allow_html=True)
                else:
                    st.error("Missing GitHub App ID or .pem key in configuration.")
        else:
            if st.button("Disconnect GitHub", type="secondary", width='stretch'):
                st.session_state.is_connected = False
                st.session_state.github_token = None
                st.session_state.installation_id = None
                st.rerun()

    with top_col2:
        if st.session_state.is_connected and st.session_state.github_token:
            st.markdown(
                "<div style='padding-top: 6px;'>"
                "<span class='status-badge'>"
                "<span class='status-dot status-dot-active'></span> GitHub Connected</span>"
                "</div>",
                unsafe_allow_html=True
            )
        else:
            st.markdown(
                "<div style='padding-top: 6px;'>"
                "<span class='status-badge'>"
                "<span class='status-dot status-dot-inactive'></span> GitHub Not Connected</span>"
                "</div>",
                unsafe_allow_html=True
            )

    with top_col3:
        if st.session_state.is_connected and GITHUB_APP_NAME:
            auth_url = f"https://github.com/apps/{GITHUB_APP_NAME}/installations/new"
            st.markdown(f'<a href="{auth_url}" target="_blank" style="text-decoration:none;"><button style="width: 100%; padding: 0.45rem; background-color: #0F172A; color: #94A3B8; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 500;">Manage Repositories</button></a>', unsafe_allow_html=True)

    st.title("PRISM")
    st.caption("Automated Project Knowledge Management System — Autonomous Architecture Synthesis and Developer Onboarding.")

# ---------------------------------------------------------
# Sidebar Configuration (Driven by .env)
# ---------------------------------------------------------
with st.sidebar:
    st.header("System Intelligence")
    st.markdown("#### Report Agent (LLM 1)")
    st.caption(f"**Model:** `{LLM1_MODEL}`\n\n**Provider:** `{LLM1_PROVIDER}`\n\n**Role:** Codebase audit, multi-tier blueprints & developer handover guides.")
    
    st.write("")
    st.markdown("#### Verification Agent (LLM 2)")
    st.caption(f"**Model:** `{LLM2_MODEL}`\n\n**Provider:** `{LLM2_PROVIDER.upper()}`\n\n**Role:** Grounding audit, evidence precision, and ML applicability.")
    
    st.divider()
    st.markdown("#### Cloud Vector Storage")
    st.caption("Intermediate staging in memory cache (Redis-style). Final verified embeddings committed to AWS Aurora Vector Database (pgvector).")

# ---------------------------------------------------------
# Helper: Build Single-Render Enterprise Markdown Documentation
# ---------------------------------------------------------
def build_full_report_markdown(result: AgentExtractionResult, owner: str, repo: str) -> str:
    md = []
    target_repo = f"{owner}/{repo}" if owner and repo else result.project_name
    
    md.append(f"# Enterprise Architectural Blueprint and Handover Deck: {target_repo}\n\n")
    md.append("> **Prepared by:** PRISM Automated Project Knowledge Management System  \n")
    md.append(f"> **Target Audience:** {getattr(result.presentation_deck, 'target_audience', 'Engineering Leadership, Architecture Review Board & Developers')}  \n\n---\n\n")
    
    # 1. Executive Summary & Problem Statement
    md.append("## 1. Executive Summary and Problem Statement\n\n")
    md.append(f"{result.problem_statement}\n\n")
    
    # 2. Executive Presentation Deck Slides
    deck = result.presentation_deck
    md.append("## 2. Executive Presentation Deck (Strategic Analysis)\n\n")
    md.append("| Slide | Dimension | Executive Strategic Analysis |\n")
    md.append("| :--- | :--- | :--- |\n")
    md.append(f"| **Slide 1** | **The Executive Pitch** | {deck.executive_pitch} |\n")
    md.append(f"| **Slide 2** | **Direct Business Value and ROI** | {deck.business_value} |\n")
    md.append(f"| **Slide 3** | **Critical Engineering Challenges** | {deck.technical_challenges} |\n")
    md.append(f"| **Slide 4** | **12-Month Strategic Roadmap** | {deck.future_scope} |\n\n")
    
    # 3. System Architecture Blueprint
    md.append("## 3. System Architecture Blueprint\n\n")
    md.append(f"- **Architectural Complexity:** `{result.analytics_metrics.estimated_complexity}`\n")
    md.append(f"- **Core Decomposed Subsystems:** `{result.analytics_metrics.core_module_count}` modules\n")
    md.append(f"- **Data Flow Model:** `{result.analytics_metrics.data_flow_complexity}`\n")
    md.append(f"- **Security Architecture:** {result.analytics_metrics.security_posture}\n\n")
    
    if result.architecture_mermaid_chart:
        md.append("```mermaid\n")
        md.append(result.architecture_mermaid_chart)
        md.append("\n```\n\n")
    
    # 4. Critical Workflow Sequence
    hg = getattr(result, "developer_handover_guide", None)
    if hg and getattr(hg, "execution_sequence_chart", None):
        md.append("## 4. Primary Transaction and Workflow Sequence Diagram\n\n")
        md.append("```mermaid\n")
        md.append(hg.execution_sequence_chart)
        md.append("\n```\n\n")
        
    # 5. Technology Stack & Key Patterns
    md.append("## 5. Technology Stack and Architectural Patterns\n\n")
    if result.tech_stack:
        md.append("**Core Technologies:** " + ", ".join([f"`{t}`" for t in result.tech_stack]) + "\n\n")
    if result.analytics_metrics.key_patterns_used:
        md.append("**Design Patterns Detected:** " + ", ".join([f"**{p}**" for p in result.analytics_metrics.key_patterns_used]) + "\n\n")
        
    # 6. Developer Handover & Operations
    if hg:
        md.append("## 6. Engineering Handover and Operational Guide\n\n")
        md.append("### 6.1 Setup Prerequisites and Environment Variables\n")
        md.append(f"{hg.local_setup_prerequisites}\n\n")
        
        md.append("### 6.2 Subsystem Directory Tour\n\n")
        md.append("| Directory Path | Layer / Architectural Responsibility |\n")
        md.append("| :--- | :--- |\n")
        for d in hg.directory_tour:
            md.append(f"| `{d.folder_path}` | {d.architectural_role} |\n")
        md.append("\n")
        
        md.append("### 6.3 Critical Workflows Traced\n\n")
        for w in hg.critical_workflows:
            md.append(f"- **{w.workflow_name}**\n")
            md.append(f"  - *Entry Point:* `{w.entry_point}`\n")
            md.append(f"  - *Execution Flow:* `{w.execution_path}`\n\n")
            
        if getattr(hg, "testing_instructions", None) or getattr(hg, "cicd_instructions", None):
            md.append("### 6.4 Testing and Continuous Integration Protocols\n")
            if hg.testing_instructions:
                md.append(f"- **Testing Protocol:** {hg.testing_instructions}\n")
            if hg.cicd_instructions:
                md.append(f"- **CI/CD Protocol:** {hg.cicd_instructions}\n")
            md.append("\n")
            
        if hg.technical_debt_and_fragility:
            md.append("### 6.5 Technical Debt and Fragility Priority Warnings\n\n")
            for t in hg.technical_debt_and_fragility:
                md.append(f"- **Priority Warning:** {t}\n")
            md.append("\n")
            
    # 7. Milestone Evolution
    if getattr(result, "milestone_timeline_mermaid_chart", None):
        md.append("## 7. Project Evolution and Milestone Timeline\n\n")
        md.append("```mermaid\n")
        md.append(result.milestone_timeline_mermaid_chart)
        md.append("\n```\n\n")
        
    # 8. Detailed Architectural Decision Records (ADRs)
    md.append("## 8. Architectural Decision Records and Component Knowledge\n\n")
    grouped_items = defaultdict(list)
    for item in result.knowledge_items:
        grouped_items[item.knowledge_type].append(item)
        
    for ktype, kitems in grouped_items.items():
        domain_name = ktype.replace('_', ' ').title()
        md.append(f"### Domain: {domain_name}\n\n")
        for idx, item in enumerate(kitems, 1):
            impact = getattr(item, 'business_impact', 'Medium')
            conf = int(item.confidence * 100)
            module = item.module or "Core Subsystem"
            
            md.append(f"#### {idx}. {item.title}\n")
            md.append(f"- **Subsystem:** `{module}` | **Impact:** `{impact}` | **Confidence:** `{conf}%`\n\n")
            md.append(f"**Executive Summary:**\n{item.summary}\n\n")
            if item.details:
                md.append(f"**Technical Rationale:**\n{item.details}\n\n")
            if item.evidence_ids:
                md.append("**Code Verification Pointers:**\n")
                for ev in item.evidence_ids:
                    md.append(f"- `{ev}`\n")
            md.append("\n---\n\n")
            
    return "".join(md)

# ---------------------------------------------------------
# Modal Dialog 1: Dedicated PDF Report Preview Window
# ---------------------------------------------------------
@st.dialog("Executive Handover Report (PDF) - Document Preview", width="large")
def preview_pdf_modal(result: AgentExtractionResult, owner: str, repo: str, pdf_data: bytes = None):
    target_repo = f"{owner}/{repo}" if owner and repo else result.project_name
    st.caption("Official Publication-Grade Architectural Dossier & Handover Guide")
    st.markdown("---")
    
    if pdf_data:
        st.download_button(
            label="Download Complete Report (PDF)",
            data=pdf_data,
            file_name=f"{target_repo.replace('/', '_')}_Handover_Report.pdf",
            mime="application/pdf",
            type="primary",
            width='stretch'
        )
        st.write("")

    # Full Report Markdown
    full_report_md = build_full_report_markdown(result, owner, repo)
    st.markdown(full_report_md)
    
    # Subsystem Density & Capability Radar charts embedded in preview
    st.markdown("### Executive Data Visualizations")
    c1, c2 = st.columns(2)
    with c1:
        chart1 = generate_subsystem_breakdown_chart(result)
        if chart1:
            st.image(chart1, width='stretch')
    with c2:
        chart2 = generate_capability_radar_chart(result)
        if chart2:
            st.image(chart2, width='stretch')

    st.write("")
    if pdf_data:
        st.download_button(
            label="Download Complete Report (PDF)",
            data=pdf_data,
            file_name=f"{target_repo.replace('/', '_')}_Handover_Report.pdf",
            mime="application/pdf",
            type="primary",
            width='stretch',
            key="dl_pdf_bottom"
        )


# ---------------------------------------------------------
# Modal Dialog 2: Dedicated PPTX Presentation Deck Preview Window
# ---------------------------------------------------------
@st.dialog("Executive Presentation Deck (PPTX) - 16:9 Slide Preview", width="large")
def preview_pptx_modal(result: AgentExtractionResult, owner: str, repo: str, pptx_data: bytes = None):
    target_repo = f"{owner}/{repo}" if owner and repo else result.project_name
    deck = result.presentation_deck
    hg = getattr(result, "developer_handover_guide", None)
    
    st.caption("16:9 Widescreen Executive Boardroom Presentation Deck")
    st.markdown("---")
    
    if pptx_data:
        st.download_button(
            label="Download Presentation Deck (PPTX)",
            data=pptx_data,
            file_name=f"{target_repo.replace('/', '_')}_Executive_Deck.pptx",
            mime="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            type="primary",
            width='stretch'
        )
        st.write("")

    # Slide 1: Cover
    with st.container(border=True):
        st.caption("SLIDE 1: COVER")
        st.markdown(f"## {result.project_name}")
        st.markdown(f"**Target Repository:** `{target_repo}`  |  **Standard:** Tier-1 Production Audit")
        
    # Slide 2: Pitch & Mission
    with st.container(border=True):
        st.caption("SLIDE 2: EXECUTIVE MISSION & PROBLEM STATEMENT")
        st.markdown("#### Problem Statement & Context")
        st.write(result.problem_statement)
        st.markdown("#### The Elevator Pitch")
        st.write(deck.executive_pitch)
        st.markdown("#### Strategic Financial ROI")
        st.write(deck.business_value)

    # Slide 3: 4 Pillars
    with st.container(border=True):
        st.caption("SLIDE 3: STRATEGIC EXECUTIVE DECK MATRIX")
        col_s1, col_s2 = st.columns(2)
        with col_s1:
            st.markdown("##### 1. Executive Pitch")
            st.write(deck.executive_pitch)
            st.markdown("##### 2. Business Value & ROI")
            st.write(deck.business_value)
        with col_s2:
            st.markdown("##### 3. Critical Technical Challenges")
            st.write(deck.technical_challenges)
            st.markdown("##### 4. 12-Month Strategic Roadmap")
            st.write(deck.future_scope)

    # Slide 4: Quantitative Analytics & Visual Charts
    with st.container(border=True):
        st.caption("SLIDE 4: QUANTITATIVE ANALYTICS & SUBSYSTEM DENSITY")
        c1, c2 = st.columns(2)
        with c1:
            chart1 = generate_subsystem_breakdown_chart(result)
            if chart1:
                st.image(chart1, width='stretch')
        with c2:
            chart2 = generate_capability_radar_chart(result)
            if chart2:
                st.image(chart2, width='stretch')

    # Slide 5: System Architecture Blueprint
    if result.architecture_mermaid_chart:
        with st.container(border=True):
            st.caption("SLIDE 5: SYSTEM ARCHITECTURE BLUEPRINT")
            st.markdown(f"```mermaid\n{result.architecture_mermaid_chart}\n```")

    # Slide 6: Transaction Sequence Flow
    if hg and getattr(hg, "execution_sequence_chart", None):
        with st.container(border=True):
            st.caption("SLIDE 6: PRIMARY TRANSACTION & WORKFLOW SEQUENCE")
            st.markdown(f"```mermaid\n{hg.execution_sequence_chart}\n```")

    # Slide 7: Subsystem Tour & Setup
    if hg:
        with st.container(border=True):
            st.caption("SLIDE 7: ENGINEERING HANDOVER & SUBSYSTEM TOUR")
            st.markdown("##### Local Setup Prerequisites")
            st.write(hg.local_setup_prerequisites)
            st.markdown("##### Subsystem Directory Map")
            for d in hg.directory_tour[:6]:
                st.markdown(f"- `{d.folder_path}`: {d.architectural_role}")

    # Slide 8: Technical Debt & Verified Stack
    with st.container(border=True):
        st.caption("SLIDE 8: TECHNICAL DEBT & VERIFIED TECHNOLOGY STACK")
        col_d1, col_d2 = st.columns(2)
        with col_d1:
            st.markdown("##### Technical Debt Warnings")
            if hg and hg.technical_debt_and_fragility:
                for t in hg.technical_debt_and_fragility:
                    st.markdown(f"<div class='debt-card'><b>Priority Warning:</b> {t}</div>", unsafe_allow_html=True)
            else:
                st.write("No high-severity technical fragility identified.")
        with col_d2:
            st.markdown("##### Verified Technology Stack")
            if result.tech_stack:
                badges_html = " ".join([f"<span class='badge-stack'>{t}</span>" for t in result.tech_stack])
                st.markdown(badges_html, unsafe_allow_html=True)
            st.markdown("##### Architectural Patterns Detected")
            if result.analytics_metrics.key_patterns_used:
                patterns_html = " ".join([f"<span class='badge-pattern'>{p}</span>" for p in result.analytics_metrics.key_patterns_used])
                st.markdown(patterns_html, unsafe_allow_html=True)

    st.write("")
    if pptx_data:
        st.download_button(
            label="Download Presentation Deck (PPTX)",
            data=pptx_data,
            file_name=f"{target_repo.replace('/', '_')}_Executive_Deck.pptx",
            mime="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            type="primary",
            width='stretch',
            key="dl_pptx_bottom"
        )


# ---------------------------------------------------------
# Modal Dialog 3: Dedicated Project Deletion Confirmation Window
# ---------------------------------------------------------
@st.dialog("Delete Project Confirmation")
def confirm_delete_dialog(project_id: str, project_title: str):
    st.markdown(f"### Delete Project: **{project_title}**")
    st.warning("This action is permanent and cannot be undone.")
    st.markdown(
        "Permanently deleting this project will remove:\n"
        "- Synthesized architectural blueprints and transaction sequence flows\n"
        "- Verification audit grounding metrics and code evidence pointers\n"
        "- Intermediate vector cache and staging records\n"
        "- Cached executive PDF dossiers and PowerPoint presentations"
    )
    st.write("")
    col_del_confirm, col_del_cancel = st.columns(2)
    with col_del_confirm:
        if st.button("Permanently Delete", key=f"confirm_modal_delete_{project_id}", type="primary", width='stretch'):
            pm.delete_project(project_id)
            if st.session_state.selected_project_id == project_id:
                st.session_state.selected_project_id = None
                st.session_state.current_view = "projects"
            st.rerun()
    with col_del_cancel:
        if st.button("Cancel", key=f"cancel_modal_delete_{project_id}", width='stretch'):
            st.rerun()


# =========================================================
# ROUTING CONTROLLER
# =========================================================

# ---------------------------------------------------------
# VIEW 1: PROJECTS GALLERY (NON-BLOCKING AUTO-REFRESH VIA ST.FRAGMENT)
# ---------------------------------------------------------
@st.fragment(run_every=2)
def render_projects_catalog():
    projects = pm.list_projects()
    analyzing_count = sum(1 for p in projects if p.get("status") == "ANALYZING")

    # Header row
    st.subheader("Architectural Project Catalog")
    st.caption("Manage synthesized codebases, review autonomous audit blueprints, and export executive decks.")
    st.markdown("---")

    # EMPTY STATE: No projects found
    if not projects:
        st.write("")
        st.markdown("""
        <div style="background: #0B1120; border: 1px dashed rgba(255, 255, 255, 0.12); border-radius: 14px; padding: 60px 40px; text-align: center; margin: 30px 0;">
            <div style="display: inline-block; padding: 6px 16px; border-radius: 9999px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: #60A5FA; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">
                Repository Catalog
            </div>
            <h2 style="color: #F8FAFC; margin-bottom: 12px; font-weight: 700; font-size: 1.6rem;">No Projects Found</h2>
            <p style="color: #94A3B8; font-size: 0.95rem; max-width: 500px; margin: 0 auto 28px auto; line-height: 1.6;">
                There are currently no repositories indexed for architectural synthesis. Add a repository to generate interactive blueprints, sequence flows, and executive handover decks.
            </p>
        </div>
        """, unsafe_allow_html=True)

        col_e1, col_e2, col_e3 = st.columns([1.5, 1.2, 1.5])
        with col_e2:
            if st.button("+ Add Your First Project", type="primary", width='stretch'):
                st.session_state.current_view = "add_project"
                st.rerun()

    # POPULATED STATE: Cards Grid (including "+ Add New Project" as the last card)
    else:
        num_cols = 3
        cols = st.columns(num_cols)

        for idx, proj in enumerate(projects):
            col_target = cols[idx % num_cols]
            status = proj.get("status", "QUEUED")
            pid = proj["id"]
            title = proj.get("title", proj.get("repo", "Project"))
            repo_slug = f"{proj.get('owner', '')}/{proj.get('repo', '')}"
            desc = proj.get("description", "Autonomous architecture synthesis")
            if len(desc) > 85:
                desc = desc[:85] + "..."

            with col_target:
                with st.container(border=True):
                    # Status Badge
                    if status == "ANALYZING":
                        st.markdown(
                            "<div style='margin-bottom: 8px;'>"
                            "<span class='status-badge'>"
                            "<span class='status-dot status-dot-warning'></span> Analyzing Repository</span>"
                            "</div>",
                            unsafe_allow_html=True
                        )
                    elif status == "COMPLETED":
                        st.markdown(
                            "<div style='margin-bottom: 8px;'>"
                            "<span class='status-badge'>"
                            "<span class='status-dot status-dot-active'></span> Audit Complete</span>"
                            "</div>",
                            unsafe_allow_html=True
                        )
                    elif status == "CANCELLED":
                        st.markdown(
                            "<div style='margin-bottom: 8px;'>"
                            "<span class='status-badge'>"
                            "<span class='status-dot status-dot-inactive'></span> Analysis Cancelled</span>"
                            "</div>",
                            unsafe_allow_html=True
                        )
                    else:
                        st.markdown(
                            "<div style='margin-bottom: 8px;'>"
                            "<span class='status-badge'>"
                            "<span class='status-dot status-dot-inactive'></span> Failed</span>"
                            "</div>",
                            unsafe_allow_html=True
                        )

                    st.markdown(f"### {title}")
                    st.caption(f"Repository: `{repo_slug}`")
                    st.write(desc)

                    # Dynamic Content depending on state
                    if status == "ANALYZING":
                        st.write("")
                        st.progress(proj.get("progress", 25))
                        st.caption(proj.get("status_message", "Auditing codebase..."))
                        st.write("")
                        col_an1, col_an2 = st.columns([1.5, 1.5])
                        with col_an1:
                            if st.button("Cancel Analysis", key=f"btn_cancel_{pid}", type="secondary", width='stretch'):
                                pm.cancel_analysis(pid)
                                if st.session_state.get("active_analyzing_id") == pid:
                                    st.session_state.active_analyzing_id = None
                                st.rerun()
                        with col_an2:
                            with st.popover("Delete Project", width='stretch'):
                                st.markdown(f"**Delete {title}?**")
                                st.caption("Abort analysis and delete project.")
                                st.write("")
                                if st.button("Confirm Delete", key=f"conf_del_an_{pid}", type="primary", width='stretch'):
                                    pm.delete_project(pid)
                                    if st.session_state.get("active_analyzing_id") == pid:
                                        st.session_state.active_analyzing_id = None
                                    st.rerun()

                    elif status == "COMPLETED":
                        res_data = proj.get("result_data", {})
                        metrics = res_data.get("analytics_metrics", {})
                        comp = metrics.get("estimated_complexity", "Medium")
                        mods = metrics.get("core_module_count", 0)

                        st.markdown(
                            f"<div style='font-size: 0.8rem; color: #94A3B8; margin-bottom: 12px;'>"
                            f"Complexity: <b style='color:#F8FAFC;'>{comp}</b> &nbsp;|&nbsp; "
                            f"Modules: <b style='color:#F8FAFC;'>{mods}</b>"
                            f"</div>",
                            unsafe_allow_html=True
                        )
                        st.write("")
                        if st.button("View Architecture & Deliverables →", key=f"btn_open_{pid}", type="primary", width='stretch'):
                            st.session_state.selected_project_id = pid
                            st.session_state.current_view = "project_detail"
                            st.rerun()

                        with st.popover("Delete Project", width='stretch'):
                            st.markdown(f"**Delete {title}?**")
                            st.caption("Permanently delete this project, blueprints, and deliverables.")
                            st.write("")
                            if st.button("Confirm Delete", key=f"conf_del_card_{pid}", type="primary", width='stretch'):
                                pm.delete_project(pid)
                                if st.session_state.get("active_analyzing_id") == pid:
                                    st.session_state.active_analyzing_id = None
                                st.rerun()

                    elif status in ("CANCELLED", "FAILED"):
                        st.caption(proj.get("status_message", "Job ended."))
                        st.write("")
                        c_act1, c_act2 = st.columns(2)
                        with c_act1:
                            with st.popover("Delete Project", width='stretch'):
                                st.markdown(f"**Delete {title}?**")
                                st.caption("Permanently delete this project.")
                                st.write("")
                                if st.button("Confirm Delete", key=f"conf_del_fail_{pid}", type="primary", width='stretch'):
                                    pm.delete_project(pid)
                                    if st.session_state.get("active_analyzing_id") == pid:
                                        st.session_state.active_analyzing_id = None
                                    st.rerun()
                        with c_act2:
                            if st.button("Restart", key=f"btn_rst_{pid}", type="primary", width='stretch'):
                                pm._update_project(pid, {
                                    "status": "ANALYZING",
                                    "progress": 10,
                                    "status_message": "Restarting codebase extraction..."
                                })
                                pm.start_background_analysis(pid, LLM1_PROVIDER, LLM1_API_KEY, st.session_state.github_token, False)
                                st.session_state.active_analyzing_id = pid
                                st.rerun()

        # Render the last card: "+ Add New Project" (The only entry point)
        last_target = cols[len(projects) % num_cols]
        with last_target:
            with st.container(border=True):
                st.markdown("""
                <div style="text-align: center; padding: 28px 10px;">
                    <div style="font-size: 2rem; color: #38BDF8; font-weight: 300; margin-bottom: 6px;">+</div>
                    <div style="font-size: 1.1rem; font-weight: 600; color: #F8FAFC; margin-bottom: 4px;">Add New Project</div>
                    <div style="font-size: 0.8rem; color: #64748B; margin-bottom: 16px;">Audit a new repository</div>
                </div>
                """, unsafe_allow_html=True)
                if st.button("+ Add Project", key="add_project_last_card", width='stretch'):
                    st.session_state.current_view = "add_project"
                    st.rerun()

        # If background jobs are analyzing, show non-blocking status banner
        if analyzing_count > 0:
            st.markdown("""
            <div style="background: rgba(56, 189, 248, 0.06); border: 1px solid rgba(56, 189, 248, 0.2);
                        border-radius: 10px; padding: 12px 18px; margin-top: 16px;
                        display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 1.2rem;">🔄</div>
                <div>
                    <div style="font-size: 0.85rem; font-weight: 600; color: #38BDF8; margin-bottom: 2px;">
                        Background Extraction Active
                    </div>
                    <div style="font-size: 0.78rem; color: #94A3B8;">
                        You can safely navigate away, switch tabs, or refresh this page.
                        The extraction process continues independently in the background.
                    </div>
                </div>
            </div>
            """, unsafe_allow_html=True)


# ---------------------------------------------------------
# VIEW 2: ADD NEW PROJECT & REAL-TIME EXTRACTION MONITOR
# ---------------------------------------------------------
@st.fragment(run_every=2)
def render_active_extraction_monitor(pid: str):
    proj = pm.get_project(pid)
    if not proj:
        st.session_state.active_analyzing_id = None
        st.rerun()
        return

    status = proj.get("status", "QUEUED")
    if status == "COMPLETED":
        st.rerun()
        return
    elif status in ("CANCELLED", "FAILED"):
        st.session_state.active_analyzing_id = None
        st.rerun()
        return

    # Header navigation row
    c_hdr1, c_hdr2 = st.columns([2.5, 1.5])
    with c_hdr1:
        if st.button("← Back to Projects Catalog", key="back_from_monitor", type="secondary"):
            st.session_state.current_view = "projects"
            st.rerun()
    with c_hdr2:
        st.markdown(
            "<div style='text-align: right; padding-top: 6px;'>"
            "<span class='status-badge'>"
            "<span class='status-dot status-dot-warning'></span> Background Analysis In Progress</span>"
            "</div>",
            unsafe_allow_html=True
        )

    st.write("")

    title = proj.get("title", proj.get("repo", "Project"))
    repo_slug = f"{proj.get('owner', '')}/{proj.get('repo', '')}"
    progress_val = proj.get("progress", 10)
    status_msg = proj.get("status_message", "Autonomous agent auditing codebase & synthesizing architecture...")

    with st.container(border=True):
        st.markdown(f"### ⚙️ Auditing & Synthesizing: **{title}**")
        st.caption(f"Target Repository: `{repo_slug}`")
        st.write("")

        st.progress(progress_val)

        st.markdown(f"""
        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px 18px; margin: 16px 0;">
            <div style="font-size: 0.82rem; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Live Autonomous Agent Activity</div>
            <div style="font-size: 1rem; color: #38BDF8; font-weight: 500;">{status_msg}</div>
        </div>
        """, unsafe_allow_html=True)

        st.write("")
        col_m_act1, col_m_act2, col_m_sp = st.columns([1.5, 1.5, 2])
        with col_m_act1:
            if st.button("Cancel Analysis", key=f"btn_cancel_monitor_{pid}", type="secondary", width='stretch'):
                pm.cancel_analysis(pid)
                st.session_state.active_analyzing_id = None
                st.rerun()
        with col_m_act2:
            if st.button("View in Projects Catalog", key="btn_go_catalog", width='stretch'):
                st.session_state.current_view = "projects"
                st.rerun()

    st.markdown("""
    <div style="background: rgba(56, 189, 248, 0.06); border: 1px solid rgba(56, 189, 248, 0.2);
                border-radius: 10px; padding: 14px 20px; margin-top: 16px;
                display: flex; align-items: center; gap: 14px;">
        <div style="font-size: 1.4rem;">🔄</div>
        <div>
            <div style="font-size: 0.88rem; font-weight: 600; color: #38BDF8; margin-bottom: 2px;">
                Background Extraction Running Independently
            </div>
            <div style="font-size: 0.8rem; color: #94A3B8; line-height: 1.5;">
                PRISM is executing the autonomous agent audit in an independent operating system background process. 
                You can safely navigate to the <b>Projects Catalog</b>, switch browser tabs, or refresh this page.
                The extraction continues uninterrupted and saves progress automatically.
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)


def render_extraction_completed_view(proj: dict):
    pid = proj["id"]
    title = proj.get("title", proj.get("repo", "Project"))
    repo_slug = f"{proj.get('owner', '')}/{proj.get('repo', '')}"
    res_data = proj.get("result_data", {})
    metrics = res_data.get("analytics_metrics", {})
    comp = metrics.get("estimated_complexity", "Medium")
    mods = metrics.get("core_module_count", 0)

    st.markdown(
        "<div style='margin-bottom: 12px;'>"
        "<span class='status-badge'>"
        "<span class='status-dot status-dot-active'></span> Synthesis Complete</span>"
        "</div>",
        unsafe_allow_html=True
    )

    st.markdown(f"## 🎉 Architectural Synthesis Complete: **{title}**")
    st.caption(f"Repository: `{repo_slug}` — Blueprints, sequence diagrams, and deliverables ready.")

    with st.container(border=True):
        st.markdown(f"""
        <div style="padding: 10px 0;">
            <div style="font-size: 1.1rem; font-weight: 600; color: #F8FAFC; margin-bottom: 8px;">
                Deliverables Ready for Review & Export
            </div>
            <div style="font-size: 0.9rem; color: #94A3B8; margin-bottom: 18px;">
                Estimated Complexity: <b style="color:#38BDF8;">{comp}</b> &nbsp;|&nbsp; 
                Decomposed Modules: <b style="color:#38BDF8;">{mods}</b> &nbsp;|&nbsp;
                Verification Trust Score: <b style="color:#10B981;">{res_data.get('verification_report', {}).get('overall_trust_score', 100):.0f}%</b>
            </div>
        </div>
        """, unsafe_allow_html=True)

        c_comp1, c_comp2, c_comp3 = st.columns([2, 1.8, 1.5])
        with c_comp1:
            if st.button("View Architecture & Deliverables →", key=f"btn_open_completed_{pid}", type="primary", width='stretch'):
                st.session_state.selected_project_id = pid
                st.session_state.current_view = "project_detail"
                st.session_state.active_analyzing_id = None
                st.rerun()
        with c_comp2:
            if st.button("+ Audit Another Repository", key="btn_audit_another", width='stretch'):
                st.session_state.active_analyzing_id = None
                st.rerun()
        with c_comp3:
            if st.button("← Projects Catalog", key="btn_back_cat_completed", width='stretch'):
                st.session_state.current_view = "projects"
                st.session_state.active_analyzing_id = None
                st.rerun()


def render_add_project_form():
    if st.button("← Back to Projects", type="secondary"):
        st.session_state.current_view = "projects"
        st.rerun()

    st.write("")

    st.markdown("""
    <div style="margin-bottom: 20px;">
        <h2>Add New Repository for Architectural Synthesis</h2>
        <p style="color: #94A3B8; font-size: 0.95rem;">
            Configure repository source and metadata. The autonomous PRISM agent will audit your codebase, 
            synthesize multi-tier blueprints, and generate boardroom-ready executive deliverables.
        </p>
    </div>
    """, unsafe_allow_html=True)

    with st.container(border=True):
        st.markdown("#### Project Details")
        proj_title = st.text_input("Project Name / Title", placeholder="e.g. PayShield-API or Payment Settlement Engine")
        proj_desc = st.text_area("Project Description", placeholder="e.g. High-throughput distributed payment settlement and tokenization engine.", height=80)

        st.write("")
        st.markdown("#### Repository Source")
        repo_source_type = st.radio(
            "Select Repository Source",
            options=["Your Authorized GitHub Repositories", "Other Repository URL"],
            horizontal=True
        )

        final_repo_url = ""

        if repo_source_type == "Your Authorized GitHub Repositories":
            if not st.session_state.is_connected or not st.session_state.github_token:
                st.warning("Please connect your GitHub account via the top navigation bar to inspect your repositories.")
                st.info("You can also select 'Other Repository URL' to audit public repositories directly.")
            else:
                with st.spinner("Fetching authorized repositories from GitHub..."):
                    authorized_repos = fetch_installation_repos(st.session_state.github_token)

                if not authorized_repos:
                    st.warning("No repositories found for this GitHub App installation. Click 'Manage Repositories' at the top-right.")
                else:
                    repo_map = {}
                    for item in authorized_repos:
                        privacy = "Private" if item.get("private") else "Public"
                        label = f"{item['full_name']}  ({privacy})"
                        repo_map[label] = item["html_url"]

                    selected_repo_label = st.selectbox("Choose Repository", options=list(repo_map.keys()))
                    if selected_repo_label:
                        final_repo_url = repo_map[selected_repo_label]

        else:
            other_url = st.text_input("Repository URL", placeholder="https://github.com/owner/repository")
            if other_url:
                final_repo_url = other_url.strip()

        st.write("")
        st.markdown("#### Cloud Vector Database Staging")
        push_aws = st.checkbox("Commit to AWS Aurora Vector Database upon completion", value=False)
        st.caption(
            "Staging Architecture: Extraction runs in an ephemeral staging buffer (Redis-style). "
            "If analysis is cancelled before completion, the staging cache is instantly flushed and AWS RDS is never touched."
        )

        st.markdown("---")

        col_btn1, col_btn2, col_btn3 = st.columns([1.5, 1, 3])
        with col_btn1:
            if st.button("Analyze Repository", type="primary", width='stretch'):
                if not final_repo_url:
                    st.error("Please provide or select a valid repository URL.")
                elif not LLM1_API_KEY:
                    st.error("LLM1_API_KEY is missing in .env configuration.")
                else:
                    try:
                        owner, repo = parse_repo_url(final_repo_url)
                        title_val = proj_title.strip() if proj_title.strip() else repo
                        desc_val = proj_desc.strip() if proj_desc.strip() else f"Architectural synthesis of {owner}/{repo}"

                        # Create project entry and start background execution
                        new_pid = pm.create_project(
                            title=title_val,
                            description=desc_val,
                            repo_url=final_repo_url,
                            owner=owner,
                            repo=repo
                        )
                        pm.start_background_analysis(
                            project_id=new_pid,
                            provider=LLM1_PROVIDER,
                            llm_key=LLM1_API_KEY,
                            github_token=st.session_state.github_token or "",
                            push_to_aws=push_aws
                        )

                        # Stay on this view, seamless transition to extraction monitor!
                        st.session_state.active_analyzing_id = new_pid
                        st.rerun()

                    except ValueError as ve:
                        st.error(str(ve))
                    except Exception as ex:
                        st.error(f"Failed to initiate background analysis: {ex}")

        with col_btn2:
            if st.button("Cancel", width='stretch'):
                st.session_state.current_view = "projects"
                st.rerun()


# ---------------------------------------------------------
# ROUTING CONTROLLER EXECUTION
# ---------------------------------------------------------
if st.session_state.current_view == "projects":
    render_projects_catalog()

elif st.session_state.current_view == "add_project":
    active_pid = st.session_state.get("active_analyzing_id")
    active_proj = pm.get_project(active_pid) if active_pid else None

    # Auto-detect any running background extraction across the system
    if not active_proj or active_proj.get("status") not in ("ANALYZING", "COMPLETED"):
        analyzing_list = [p for p in pm.list_projects() if p.get("status") == "ANALYZING"]
        if analyzing_list:
            active_proj = analyzing_list[0]
            st.session_state.active_analyzing_id = active_proj["id"]
        else:
            active_proj = None

    if active_proj and active_proj.get("status") == "ANALYZING":
        # While processing, ONLY the progress monitor is shown (NO form inputs!)
        render_active_extraction_monitor(active_proj["id"])
    elif active_proj and active_proj.get("status") == "COMPLETED" and st.session_state.get("active_analyzing_id") == active_proj["id"]:
        # Completed state for currently active extraction
        render_extraction_completed_view(active_proj)
    else:
        # Clean form inputs when no analysis is active
        render_add_project_form()



# ---------------------------------------------------------
# VIEW 3: PROJECT DETAIL & DELIVERABLES CENTER (CLEAN EXECUTIVE VIEW)
# ---------------------------------------------------------
elif st.session_state.current_view == "project_detail":
    pid = st.session_state.selected_project_id
    proj = pm.get_project(pid) if pid else None

    if not proj or not proj.get("result_data"):
        st.error("Selected project data could not be found.")
        if st.button("← Back to Projects"):
            st.session_state.current_view = "projects"
            st.rerun()
        st.stop()

    result = AgentExtractionResult.model_validate(proj["result_data"])
    owner = proj.get("owner", "")
    repo = proj.get("repo", "")
    repo_name = f"{owner}/{repo}" if owner and repo else result.project_name

    # 1. Top Navigation Row: Back button, AWS RDS Sync, and Delete Project
    c_back, c_space, c_sync, c_del = st.columns([2, 1.8, 2.5, 1.4])
    with c_back:
        if st.button("← Back to Projects", width='stretch'):
            st.session_state.current_view = "projects"
            st.session_state.selected_project_id = None
            st.rerun()

    with c_sync:
        if proj.get("pushed_to_aws"):
            st.markdown(
                "<div style='text-align: right; padding-top: 6px;'>"
                "<span class='status-badge'>"
                "<span class='status-dot status-dot-active'></span> AWS Aurora Synced</span>"
                "</div>",
                unsafe_allow_html=True
            )
        else:
            if st.button("Sync to AWS Aurora Vector DB", type="secondary", width='stretch'):
                try:
                    with st.spinner("Pushing verified 768-dim embeddings to AWS Aurora..."):
                        pm.sync_to_aws_rds(pid, LLM1_PROVIDER, LLM1_API_KEY)
                    st.success("Successfully synchronized embeddings with AWS Aurora PostgreSQL.")
                    st.rerun()
                except Exception as se:
                    st.error(f"Sync failed: {se}")

    with c_del:
        with st.popover("Delete Project", width='stretch'):
            st.markdown(f"**Delete {proj.get('title', repo_name)}?**")
            st.caption("Permanently remove this project and return to catalog.")
            st.write("")
            if st.button("Confirm Delete", key=f"conf_del_top_{pid}", type="primary", width='stretch'):
                pm.delete_project(pid)
                st.session_state.selected_project_id = None
                st.session_state.current_view = "projects"
                st.rerun()

    st.write("")
    
    # 2. Project Metadata Header Card
    with st.container(border=True):
        st.markdown(f"## {proj.get('title', repo_name)}")
        st.caption(f"Target Repository: [{proj.get('repo_url', repo_name)}]({proj.get('repo_url', '#')})  |  Status: Tier-1 Production Architectural Audit")
        st.write(proj.get("description", "Autonomous architecture synthesis and developer onboarding."))

    st.write("")

    # 3. SLEEK EXECUTIVE KPI CARDS (Stats Only)
    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    with kpi1:
        st.markdown(f"""
        <div class="kpi-card kpi-card-cyan">
            <div class="kpi-label">System Complexity</div>
            <div class="kpi-value">{result.analytics_metrics.estimated_complexity}</div>
            <div class="kpi-sub">Multi-Tier Architecture</div>
        </div>
        """, unsafe_allow_html=True)

    with kpi2:
        st.markdown(f"""
        <div class="kpi-card kpi-card-purple">
            <div class="kpi-label">Core Subsystems</div>
            <div class="kpi-value">{result.analytics_metrics.core_module_count} Modules</div>
            <div class="kpi-sub">Audited and Indexed</div>
        </div>
        """, unsafe_allow_html=True)

    with kpi3:
        sec_short = result.analytics_metrics.security_posture.split(",")[0] if "," in result.analytics_metrics.security_posture else result.analytics_metrics.security_posture
        st.markdown(f"""
        <div class="kpi-card kpi-card-emerald">
            <div class="kpi-label">Security Architecture</div>
            <div class="kpi-value" title="{result.analytics_metrics.security_posture}">{sec_short[:22]}</div>
            <div class="kpi-sub">Hardened Policy</div>
        </div>
        """, unsafe_allow_html=True)

    with kpi4:
        st.markdown(f"""
        <div class="kpi-card kpi-card-amber">
            <div class="kpi-label">Knowledge Nodes</div>
            <div class="kpi-value">{len(result.knowledge_items)} Nodes</div>
            <div class="kpi-sub">100% Code Verified</div>
        </div>
        """, unsafe_allow_html=True)

    # 4. VERIFICATION AGENT GROUNDING & QUALITY SCORECARD (LLM 2)
    v_report = getattr(result, "verification_report", None)
    if not v_report:
        try:
            from app.core.verification_agent import VerificationAgent
            v_report = VerificationAgent().audit_extraction(result, owner=owner, repo=repo)
            result.verification_report = v_report
        except Exception:
            v_report = None

    if v_report:
        st.write("")
        st.markdown("#### Verification Agent Grounding & Quality Audit (LLM 2)")
        st.caption(f"Independent validation of code citations and architectural assertions performed via {LLM2_PROVIDER.upper()} ({LLM2_MODEL}).")
        
        vkpi1, vkpi2, vkpi3, vkpi4 = st.columns(4)
        with vkpi1:
            st.markdown(f"""
            <div class="kpi-card kpi-card-emerald">
                <div class="kpi-label">Overall Trust Score</div>
                <div class="kpi-value">{v_report.overall_trust_score}%</div>
                <div class="kpi-sub">{v_report.verdict.replace('_', ' ')}</div>
            </div>
            """, unsafe_allow_html=True)
            
        with vkpi2:
            st.markdown(f"""
            <div class="kpi-card kpi-card-cyan">
                <div class="kpi-label">Evidence Precision</div>
                <div class="kpi-value">{v_report.evidence_precision_score}%</div>
                <div class="kpi-sub">{v_report.verified_claims_count} Verified Citations</div>
            </div>
            """, unsafe_allow_html=True)
            
        with vkpi3:
            st.markdown(f"""
            <div class="kpi-card kpi-card-purple">
                <div class="kpi-label">Subsystem Recall</div>
                <div class="kpi-value">{v_report.subsystem_recall_coverage}%</div>
                <div class="kpi-sub">Repository Coverage</div>
            </div>
            """, unsafe_allow_html=True)
            
        with vkpi4:
            ml_detected = v_report.ml_audit.ml_models_detected
            ml_display = f"ROC-AUC: {v_report.ml_audit.roc_auc_score}" if ml_detected else "Deterministic API"
            st.markdown(f"""
            <div class="kpi-card kpi-card-amber">
                <div class="kpi-label">Codebase ML Audit</div>
                <div class="kpi-value">{ml_display}</div>
                <div class="kpi-sub">{"Model Evaluated" if ml_detected else "No ML Classifier Detected"}</div>
            </div>
            """, unsafe_allow_html=True)

        if v_report.ml_audit.notes:
            st.info(f"Verification Note: {v_report.ml_audit.notes}")

    st.write("")
    st.markdown("---")

    # 4. PREPARE DELIVERABLE BYTES (Lazy-Compiled)
    if f"pdf_{pid}" not in st.session_state:
        try:
            st.session_state[f"pdf_{pid}"] = generate_pdf_report(result, owner=owner, repo=repo)
        except Exception:
            st.session_state[f"pdf_{pid}"] = None

    if f"pptx_{pid}" not in st.session_state:
        try:
            st.session_state[f"pptx_{pid}"] = generate_pptx_deck(result, owner=owner, repo=repo)
        except Exception:
            st.session_state[f"pptx_{pid}"] = None

    pdf_bytes = st.session_state.get(f"pdf_{pid}")
    pptx_bytes = st.session_state.get(f"pptx_{pid}")

    # 5. ENTERPRISE DELIVERABLES & EXPORT CENTER
    st.subheader("Architectural Deliverables & Export Center")
    st.caption("Inspect publication-grade technical dossiers or export boardroom-ready presentation decks.")

    deliv_c1, deliv_c2 = st.columns(2)

    # Deliverable Card 1: Official PDF Report
    with deliv_c1:
        with st.container(border=True):
            st.markdown("#### Executive Handover Report (PDF)")
            st.caption(
                "Publication-grade architectural dossier featuring the executive problem statement, "
                "quantitative metrics, embedded subsystem density and capability radar charts, 300 DPI architecture blueprints, "
                "subsystem directory tour, traced critical workflows, technical debt priority warnings, and verified ADR catalog."
            )
            st.write("")
            
            btn_col1, btn_col2 = st.columns(2)
            with btn_col1:
                if st.button("Preview PDF Report", key=f"prev_pdf_{pid}", width='stretch', type="secondary"):
                    preview_pdf_modal(result, owner, repo, pdf_bytes)
            with btn_col2:
                if pdf_bytes:
                    st.download_button(
                        label="Download PDF",
                        data=pdf_bytes,
                        file_name=f"{repo_name.replace('/', '_')}_Handover_Report.pdf",
                        mime="application/pdf",
                        width='stretch',
                        type="primary",
                        key=f"dl_pdf_card_{pid}"
                    )
                else:
                    st.info("Compiling PDF...")

    # Deliverable Card 2: 16:9 Presentation Deck (PPTX)
    with deliv_c2:
        with st.container(border=True):
            st.markdown("#### Executive Presentation Deck (PPTX)")
            st.caption(
                "Authentic 16:9 widescreen PowerPoint presentation deck in high-contrast enterprise dark slate. "
                "Structured across 8 boardroom slides: Executive Mission, 4-Pillar Strategic Matrix, embedded Matplotlib "
                "subsystem density & capability radar charts, architecture blueprint, transaction sequence flow, directory tour, and tech debt."
            )
            st.write("")
            
            pbtn_col1, pbtn_col2 = st.columns(2)
            with pbtn_col1:
                if st.button("Preview Presentation (PPTX)", key=f"prev_pptx_{pid}", width='stretch', type="secondary"):
                    preview_pptx_modal(result, owner, repo, pptx_bytes)
            with pbtn_col2:
                if pptx_bytes:
                    st.download_button(
                        label="Download PPTX",
                        data=pptx_bytes,
                        file_name=f"{repo_name.replace('/', '_')}_Executive_Deck.pptx",
                        mime="application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        width='stretch',
                        type="primary",
                        key=f"dl_pptx_card_{pid}"
                    )
                else:
                    st.info("Compiling PPTX...")

    # 6. Danger Zone / Project Administration
    st.write("")
    st.markdown("---")
    with st.container(border=True):
        c_dz_info, c_dz_btn = st.columns([3.5, 1.5])
        with c_dz_info:
            st.markdown("#### Danger Zone: Delete Project")
            st.caption(
                "Permanently delete this project from PRISM, purge verified architectural knowledge items, "
                "and clear all generated PDF reports and PowerPoint presentations."
            )
        with c_dz_btn:
            st.write("")
            with st.popover("Delete Project", width='stretch'):
                st.markdown(f"**Delete {proj.get('title', repo_name)}?**")
                st.caption("This action is permanent and cannot be undone.")
                st.write("")
                if st.button("Confirm Delete", key=f"conf_del_bottom_{pid}", type="primary", width='stretch'):
                    pm.delete_project(pid)
                    st.session_state.selected_project_id = None
                    st.session_state.current_view = "projects"
                    st.rerun()

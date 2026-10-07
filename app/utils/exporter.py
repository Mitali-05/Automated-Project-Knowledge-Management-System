# app/utils/exporter.py
from io import BytesIO
import base64
import requests
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Image
from app.core.models import AgentExtractionResult

def get_mermaid_image(mermaid_text: str):
    """Fetches a rendered image of a Mermaid chart from mermaid.ink API."""
    if not mermaid_text:
        return None
    try:
        encoded = base64.b64encode(mermaid_text.encode('utf-8')).decode('utf-8')
        url = f"https://mermaid.ink/img/{encoded}?bgColor=!white"
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            return BytesIO(resp.content)
    except Exception as e:
        print(f"Failed to fetch mermaid image: {e}")
    return None

def generate_pdf_report(result: AgentExtractionResult) -> bytes:
    """Generates a highly professional PDF document of the Handover Guide."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontSize=20, leading=24, textColor=colors.HexColor("#1E293B"))
    h2_style = ParagraphStyle('Heading2', parent=styles['Heading2'], fontSize=16, leading=20, spaceBefore=15, textColor=colors.HexColor("#0F172A"))
    h3_style = ParagraphStyle('Heading3', parent=styles['Heading3'], fontSize=12, leading=16, spaceBefore=10, textColor=colors.HexColor("#334155"))
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, textColor=colors.HexColor("#334155"))
    bullet_style = ParagraphStyle('Bullet', parent=styles['Normal'], fontSize=10, leading=14, leftIndent=20, bulletIndent=10)

    story = []

    # Document Header
    story.append(Paragraph(f"{result.project_name} - Engineering Handover Guide", title_style))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=15))

    # 1. Executive Summary
    story.append(Paragraph("1. Executive Summary & Problem Statement", h2_style))
    story.append(Paragraph(result.problem_statement, body_style))
    
    story.append(Paragraph("Presentation Pitch:", h3_style))
    story.append(Paragraph(result.presentation_deck.executive_pitch, body_style))

    # 2. Tech Stack & Architecture
    story.append(Paragraph("2. Technical Stack & Architecture", h2_style))
    story.append(Paragraph(f"<b>Tech Stack:</b> {', '.join(result.tech_stack)}", body_style))
    
    # Architecture Mermaid Chart
    if result.architecture_mermaid_chart:
        story.append(Paragraph("System Architecture Flowchart:", h3_style))
        arch_img = get_mermaid_image(result.architecture_mermaid_chart)
        if arch_img:
            story.append(Image(arch_img, width=450, height=300, kind='proportional'))
        else:
            story.append(Paragraph("<i>(Architecture Diagram could not be rendered)</i>", body_style))
            
    # Milestone Chart
    if hasattr(result, "milestone_timeline_mermaid_chart") and result.milestone_timeline_mermaid_chart:
        story.append(Paragraph("Project Milestone Timeline:", h3_style))
        time_img = get_mermaid_image(result.milestone_timeline_mermaid_chart)
        if time_img:
            story.append(Image(time_img, width=450, height=200, kind='proportional'))

    # 3. Developer Handover
    hg = result.developer_handover_guide
    if hg:
        story.append(Paragraph("3. Getting Started (Local Setup)", h2_style))
        story.append(Paragraph(hg.local_setup_prerequisites, body_style))
        
        story.append(Paragraph("4. Directory Tour & Dependency Map", h2_style))
        for d in hg.directory_tour:
            story.append(Paragraph(f"• <b>{d.folder_path}</b>: {d.architectural_role}", bullet_style))
            
        if hasattr(hg, "directory_dependency_chart") and hg.directory_dependency_chart:
            story.append(Spacer(1, 10))
            dir_img = get_mermaid_image(hg.directory_dependency_chart)
            if dir_img:
                story.append(Image(dir_img, width=450, height=250, kind='proportional'))

        story.append(Paragraph("5. Critical Workflows Traced", h2_style))
        for w in hg.critical_workflows:
            story.append(Paragraph(f"<b>{w.workflow_name}</b>", h3_style))
            story.append(Paragraph(f"Entry Point: <code>{w.entry_point}</code>", body_style))
            story.append(Paragraph(f"Execution Path: {w.execution_path}", body_style))
            
        if hasattr(hg, "execution_sequence_chart") and hg.execution_sequence_chart:
            story.append(Spacer(1, 10))
            seq_img = get_mermaid_image(hg.execution_sequence_chart)
            if seq_img:
                story.append(Image(seq_img, width=450, height=300, kind='proportional'))

        if hasattr(hg, "testing_instructions") and (hg.testing_instructions or hg.cicd_instructions):
            story.append(Paragraph("6. Development Lifecycle & Operations", h2_style))
            if hg.testing_instructions:
                story.append(Paragraph(f"<b>Testing:</b> {hg.testing_instructions}", body_style))
            if hg.cicd_instructions:
                story.append(Paragraph(f"<b>CI/CD:</b> {hg.cicd_instructions}", body_style))

        story.append(Paragraph("7. Technical Debt & Fragility", h2_style))
        for t in hg.technical_debt_and_fragility:
            story.append(Paragraph(f"• {t}", bullet_style))

    # 4. Detailed Knowledge Items
    story.append(Paragraph("8. Detailed Knowledge Extracted", h2_style))
    for idx, item in enumerate(result.knowledge_items, 1):
        story.append(Paragraph(f"<b>{idx}. {item.title}</b> <font color='#64748B'>[{item.knowledge_type}]</font>", h3_style))
        story.append(Paragraph(item.summary, body_style))
        story.append(Spacer(1, 4))
        if item.evidence_ids:
            story.append(Paragraph("<b>Evidence:</b> " + ", ".join(item.evidence_ids), bullet_style))

    # Build PDF
    doc.build(story)
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data
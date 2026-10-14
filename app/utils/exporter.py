# app/utils/exporter.py
from io import BytesIO
import base64
import requests
from collections import defaultdict
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Image, Table, TableStyle, KeepTogether, PageBreak
)
from app.core.models import AgentExtractionResult
from app.utils.charts import generate_subsystem_breakdown_chart, generate_capability_radar_chart

def get_mermaid_image(mermaid_text: str):
    """Fetches a high-resolution 3x supersampled image of a Mermaid chart from mermaid.ink."""
    if not mermaid_text or not mermaid_text.strip():
        return None
    try:
        # Prepend clean high-contrast base theme if not already initialized
        clean_text = mermaid_text.strip()
        if not clean_text.startswith("%%{init:"):
            theme_header = "%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#1E3A8A', 'primaryTextColor': '#FFFFFF', 'primaryBorderColor': '#0F172A', 'lineColor': '#334155', 'secondaryColor': '#0284C7', 'tertiaryColor': '#F1F5F9', 'fontSize': '13px', 'fontFamily': 'Helvetica'}}}%%\n"
            clean_text = theme_header + clean_text
            
        encoded = base64.b64encode(clean_text.encode('utf-8')).decode('utf-8')
        url = f"https://mermaid.ink/img/{encoded}?bgColor=!white&scale=3"
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            return BytesIO(resp.content)
    except Exception as e:
        print(f"Failed to fetch mermaid image: {e}")
    return None

def generate_pdf_report(result: AgentExtractionResult, owner: str = "", repo: str = "") -> bytes:
    """
    Generates a publication-grade PDF document of the Architectural Blueprint & Handover Deck.
    Eliminates orphan headers and table splits with structured PageBreaks and KeepTogether blocks.
    Embeds high-resolution quantitative charts and multi-tier architecture blueprints.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Sophisticated Corporate Typography & Color Palette
    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Heading1'], fontSize=18, leading=22, 
        textColor=colors.HexColor("#0F172A"), fontName="Helvetica-Bold", spaceAfter=4
    )
    deck_sub = ParagraphStyle(
        'DeckSub', parent=styles['Normal'], fontSize=11, leading=14, 
        textColor=colors.HexColor("#2563EB"), fontName="Helvetica-Bold", spaceAfter=3
    )
    subtitle_style = ParagraphStyle(
        'DocSub', parent=styles['Normal'], fontSize=8.5, leading=12, 
        textColor=colors.HexColor("#64748B"), fontName="Helvetica"
    )
    h1_style = ParagraphStyle(
        'Heading1', parent=styles['Heading1'], fontSize=12, leading=16, 
        spaceBefore=14, spaceAfter=8, textColor=colors.HexColor("#0F172A"), fontName="Helvetica-Bold"
    )
    h2_style = ParagraphStyle(
        'Heading2', parent=styles['Heading2'], fontSize=10, leading=14, 
        spaceBefore=8, spaceAfter=4, textColor=colors.HexColor("#1E293B"), fontName="Helvetica-Bold"
    )
    body_style = ParagraphStyle(
        'Body', parent=styles['Normal'], fontSize=8.5, leading=12.5, 
        textColor=colors.HexColor("#334155"), fontName="Helvetica"
    )
    body_bold = ParagraphStyle(
        'BodyBold', parent=body_style, fontName="Helvetica-Bold", textColor=colors.HexColor("#0F172A")
    )
    table_cell = ParagraphStyle(
        'TableCell', parent=body_style, fontSize=8, leading=11.5
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold', parent=body_style, fontSize=8, leading=11.5, fontName="Helvetica-Bold", textColor=colors.HexColor("#0F172A")
    )
    table_header = ParagraphStyle(
        'TableHeader', parent=body_style, fontSize=8, leading=11, fontName="Helvetica-Bold", textColor=colors.HexColor("#FFFFFF")
    )
    bullet_style = ParagraphStyle(
        'Bullet', parent=body_style, leftIndent=12, bulletIndent=6, spaceAfter=2
    )
    debt_callout = ParagraphStyle(
        'DebtCallout', parent=body_style, textColor=colors.HexColor("#92400E"), fontName="Helvetica"
    )

    story = []

    # =========================================================
    # PAGE 1: Title, Executive Summary & Executive Strategy Deck
    # =========================================================
    target_repo = f"{owner}/{repo}" if owner and repo else result.project_name
    story.append(Paragraph(f"{result.project_name}", title_style))
    story.append(Paragraph("Enterprise Architectural Blueprint and Engineering Handover Deck", deck_sub))
    story.append(Paragraph(f"Target Repository: {target_repo} &nbsp;|&nbsp; Reference: PRISM-ARCH-AUDIT &nbsp;|&nbsp; Standard: Tier-1 Production", subtitle_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0F172A"), spaceAfter=10))

    # 1. Executive Summary & Problem Statement
    story.append(Paragraph("1. Executive Summary and Problem Statement", h1_style))
    story.append(Paragraph(result.problem_statement.replace("\n", "<br/>"), body_style))
    story.append(Spacer(1, 10))

    # 2. Executive Presentation Deck Table
    deck = result.presentation_deck
    story.append(Paragraph("2. Executive Presentation Deck (Strategic Analysis)", h1_style))
    deck_table_data = [
        [Paragraph("Slide / Focus", table_header), Paragraph("Executive Strategic Analysis", table_header)],
        [Paragraph("The Executive Pitch", table_cell_bold), Paragraph(deck.executive_pitch, table_cell)],
        [Paragraph("Business Value and ROI", table_cell_bold), Paragraph(deck.business_value, table_cell)],
        [Paragraph("Technical Challenges Solved", table_cell_bold), Paragraph(deck.technical_challenges, table_cell)],
        [Paragraph("12-Month Strategic Roadmap", table_cell_bold), Paragraph(deck.future_scope, table_cell)],
    ]
    deck_table = Table(deck_table_data, colWidths=[130, 410])
    deck_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(deck_table)
    
    # End Page 1 cleanly
    story.append(PageBreak())

    # =========================================================
    # PAGE 2: Quantitative System Analytics & Excel-Style Charts
    # =========================================================
    story.append(Paragraph("3. Quantitative System Analytics and Metrics", h1_style))
    metrics = result.analytics_metrics
    
    metrics_data = [
        [Paragraph("Architectural Dimension", table_header), Paragraph("Audit Finding / Technical Specification", table_header)],
        [Paragraph("System Complexity Rating", table_cell_bold), Paragraph(metrics.estimated_complexity, table_cell)],
        [Paragraph("Core Decomposed Subsystems", table_cell_bold), Paragraph(f"{metrics.core_module_count} Modules Audited", table_cell)],
        [Paragraph("Data Flow Complexity", table_cell_bold), Paragraph(metrics.data_flow_complexity, table_cell)],
        [Paragraph("Security Architecture", table_cell_bold), Paragraph(metrics.security_posture, table_cell)],
        [Paragraph("Design Patterns Detected", table_cell_bold), Paragraph(", ".join(metrics.key_patterns_used) if metrics.key_patterns_used else "Layered Architecture, Repository Pattern", table_cell)],
    ]
    metrics_table = Table(metrics_data, colWidths=[150, 390])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 10))

    # Embed Real Matplotlib PPTX/Excel Data Charts
    story.append(Paragraph("Executive Subsystem Density & Capability Radar", h2_style))
    try:
        c1 = generate_subsystem_breakdown_chart(result)
        c2 = generate_capability_radar_chart(result)
        chart_table_data = [
            [Image(c1, width=320, height=170), Image(c2, width=210, height=170)]
        ]
        chart_table = Table(chart_table_data, colWidths=[330, 210])
        chart_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        story.append(chart_table)
    except Exception as e:
        print(f"Failed to render matplotlib charts in PDF: {e}")

    # End Page 2 cleanly
    story.append(PageBreak())

    # =========================================================
    # PAGE 3: System Architecture Blueprint & Workflow Sequence
    # =========================================================
    if result.architecture_mermaid_chart:
        arch_flow = []
        arch_flow.append(Paragraph("4. System Architecture Blueprint", h1_style))
        arch_img = get_mermaid_image(result.architecture_mermaid_chart)
        if arch_img:
            arch_flow.append(Image(arch_img, width=540, height=270, kind='proportional'))
        else:
            arch_flow.append(Paragraph("<i>(Architecture blueprint diagram vector available in dashboard)</i>", body_style))
        story.append(KeepTogether(arch_flow))
        story.append(Spacer(1, 10))

    hg = getattr(result, "developer_handover_guide", None)
    if hg and getattr(hg, "execution_sequence_chart", None):
        seq_flow = []
        seq_flow.append(Paragraph("5. Primary Transaction and Workflow Sequence Diagram", h1_style))
        seq_img = get_mermaid_image(hg.execution_sequence_chart)
        if seq_img:
            seq_flow.append(Image(seq_img, width=540, height=250, kind='proportional'))
        story.append(KeepTogether(seq_flow))

    # End Page 3 cleanly
    story.append(PageBreak())

    # =========================================================
    # PAGE 4: Engineering Handover, Directory Tour & Technical Debt
    # =========================================================
    story.append(Paragraph("6. Verified Technology Stack", h1_style))
    if result.tech_stack:
        story.append(Paragraph("<b>Core Stack Components:</b> " + ", ".join(result.tech_stack), body_style))
    story.append(Spacer(1, 8))

    if hg:
        story.append(Paragraph("7. Engineering Handover and Operational Guide", h1_style))
        
        # 7.1 Setup Prerequisites
        story.append(Paragraph("7.1 Local Environment Setup and Prerequisites", h2_style))
        story.append(Paragraph(hg.local_setup_prerequisites.replace("\n", "<br/>"), body_style))
        story.append(Spacer(1, 6))
        
        # 7.2 Directory Tour Table
        if hg.directory_tour:
            story.append(Paragraph("7.2 Subsystem Directory Tour", h2_style))
            dir_data = [
                [Paragraph("Directory Path", table_header), Paragraph("Architectural Responsibility and Layer", table_header)]
            ]
            for d in hg.directory_tour:
                dir_data.append([
                    Paragraph(f"<code>{d.folder_path}</code>", table_cell_bold),
                    Paragraph(d.architectural_role, table_cell)
                ])
            dir_table = Table(dir_data, colWidths=[170, 370])
            dir_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(dir_table)
            story.append(Spacer(1, 8))

        # 7.3 Critical Workflows
        if hg.critical_workflows:
            story.append(Paragraph("7.3 Critical Execution Workflows Traced", h2_style))
            for w in hg.critical_workflows:
                story.append(Paragraph(f"<b>Workflow: {w.workflow_name}</b>", body_bold))
                story.append(Paragraph(f"• Entry Point: <code>{w.entry_point}</code>", bullet_style))
                story.append(Paragraph(f"• Execution Flow: {w.execution_path}", bullet_style))
            story.append(Spacer(1, 6))

        # 7.4 Technical Debt Priority Warnings
        if hg.technical_debt_and_fragility:
            story.append(Paragraph("7.4 Technical Debt and Fragility Priority Warnings", h2_style))
            debt_data = []
            for t in hg.technical_debt_and_fragility:
                debt_data.append([Paragraph(f"<b>Priority Warning:</b> {t}", debt_callout)])
            debt_table = Table(debt_data, colWidths=[540])
            debt_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#F59E0B")),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(debt_table)

    # End Page 4 cleanly
    story.append(PageBreak())

    # =========================================================
    # PAGE 5+: Project Evolution & Architectural Decisions (ADRs)
    # =========================================================
    if getattr(result, "milestone_timeline_mermaid_chart", None):
        time_flow = []
        time_flow.append(Paragraph("8. Project Evolution and Milestone Timeline", h1_style))
        time_img = get_mermaid_image(result.milestone_timeline_mermaid_chart)
        if time_img:
            time_flow.append(Image(time_img, width=540, height=160, kind='proportional'))
        story.append(KeepTogether(time_flow))
        story.append(Spacer(1, 10))

    story.append(Paragraph("9. Architectural Decision Records and Component Knowledge", h1_style))
    grouped_items = defaultdict(list)
    for item in result.knowledge_items:
        grouped_items[item.knowledge_type].append(item)

    for ktype, kitems in grouped_items.items():
        domain_title = ktype.replace('_', ' ').title()
        domain_flow = []
        domain_flow.append(Paragraph(f"Domain: {domain_title}", h2_style))
        
        for idx, item in enumerate(kitems, 1):
            impact = getattr(item, 'business_impact', 'Medium')
            conf = int(item.confidence * 100)
            module = item.module or "Core Subsystem"
            
            domain_flow.append(Paragraph(f"<b>{idx}. {item.title}</b> &nbsp;|&nbsp; <font color='#64748B'>[{module}] &nbsp;•&nbsp; Impact: {impact} &nbsp;•&nbsp; Confidence: {conf}%</font>", h2_style))
            domain_flow.append(Paragraph(f"<b>Executive Summary:</b> {item.summary}", body_style))
            if item.details:
                domain_flow.append(Paragraph(f"<b>Technical Rationale:</b> {item.details}", body_style))
            if item.evidence_ids:
                domain_flow.append(Paragraph(f"<b>Code Verification Pointers:</b> <code>{', '.join(item.evidence_ids)}</code>", bullet_style))
            domain_flow.append(Spacer(1, 4))
            
        story.append(KeepTogether(domain_flow))
        story.append(Spacer(1, 6))

    # Build PDF
    doc.build(story)
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data
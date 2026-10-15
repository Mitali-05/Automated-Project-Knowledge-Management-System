# app/utils/exporter.py
import os
import re
from io import BytesIO
from collections import defaultdict
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Image, Table, TableStyle, PageBreak
)
from app.core.models import AgentExtractionResult
from app.utils.charts import (
    generate_subsystem_breakdown_chart,
    generate_capability_radar_chart,
    generate_native_blueprint_chart,
    generate_native_sequence_chart
)
from app.utils.diagram_renderer import render_mermaid_to_png

def sanitize_text(text: str) -> str:
    """Masks credentials and connection URIs."""
    if not text:
        return ""
    text = re.sub(r'(MONGODB_URI=)[^\s,]+', r'\1mongodb+srv://[REDACTED]', text)
    text = re.sub(r'(SMTP_PASS=)[^\s,]+', r'\1[REDACTED_PASSWORD]', text)
    text = re.sub(r'(JWT_SECRET=)[^\s,]+', r'\1[REDACTED_SECRET]', text)
    text = re.sub(r'(DB_PASSWORD=)[^\s,]+', r'\1[REDACTED_PASSWORD]', text)
    return text

def generate_pdf_report(result: AgentExtractionResult, owner: str = "", repo: str = "") -> bytes:
    buffer = BytesIO()
    # Letter is 612 x 792 pt. Margins 36 pt leave 540 pt printable width x 720 pt height.
    doc = SimpleDocTemplate(
        buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
    )

    styles = getSampleStyleSheet()
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
    # PAGE 1: Exec Summary & Presentation Matrix Table
    # =========================================================
    target_repo = f"{owner}/{repo}" if owner and repo else result.project_name
    story.append(Paragraph(f"{result.project_name}", title_style))
    story.append(Paragraph("Enterprise Architectural Blueprint and Engineering Handover Deck", deck_sub))
    story.append(Paragraph(f"Target Repository: {target_repo} &nbsp;|&nbsp; Reference: PRISM-ARCH-AUDIT &nbsp;|&nbsp; Standard: Tier-1 Production", subtitle_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0F172A"), spaceAfter=10))

    story.append(Paragraph("1. Executive Summary and Problem Statement", h1_style))
    story.append(Paragraph(sanitize_text(result.problem_statement).replace("\n", "<br/>"), body_style))
    story.append(Spacer(1, 10))

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
    story.append(PageBreak())

    # =========================================================
    # PAGE 2: Analytics & Radar Visualizations
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

    story.append(Paragraph("Executive Subsystem Density & Capability Radar", h2_style))
    try:
        c1 = generate_subsystem_breakdown_chart(result)
        c2 = generate_capability_radar_chart(result)
        chart_table_data = [[Image(c1, width=320, height=170), Image(c2, width=210, height=170)]]
        chart_table = Table(chart_table_data, colWidths=[330, 210])
        chart_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        story.append(chart_table)
    except Exception as e:
        print(f"Chart render error: {e}")

    story.append(PageBreak())

    # =========================================================
    # PAGE 3: Section 4 - System Architecture Blueprint (Dedicated Page)
    # =========================================================
    story.append(Paragraph("4. System Architecture Blueprint", h1_style))
    story.append(Spacer(1, 6))
    
    arch_png_path = render_mermaid_to_png(result.architecture_mermaid_chart, f"{owner}_{repo}_arch")
    if arch_png_path and os.path.exists(arch_png_path):
        story.append(Image(arch_png_path, width=540, height=440, kind='proportional'))
    else:
        native_arch = generate_native_blueprint_chart(result.architecture_mermaid_chart, result.project_name)
        story.append(Image(native_arch, width=540, height=440, kind='proportional'))
    story.append(PageBreak())

    # =========================================================
    # PAGE 4: Section 5 - Primary Transaction Sequence Diagram (Dedicated Page)
    # =========================================================
    hg = getattr(result, "developer_handover_guide", None)
    if hg and getattr(hg, "execution_sequence_chart", None):
        story.append(Paragraph("5. Primary Transaction and Workflow Sequence Diagram", h1_style))
        story.append(Spacer(1, 6))
        
        seq_png_path = render_mermaid_to_png(hg.execution_sequence_chart, f"{owner}_{repo}_seq")
        if seq_png_path and os.path.exists(seq_png_path):
            story.append(Image(seq_png_path, width=540, height=440, kind='proportional'))
        else:
            native_seq = generate_native_sequence_chart(hg.execution_sequence_chart)
            story.append(Image(native_seq, width=540, height=440, kind='proportional'))
        story.append(PageBreak())

    # =========================================================
    # PAGE 5: Handover Guide, Directory Tour & Technical Debt
    # =========================================================
    story.append(Paragraph("6. Verified Technology Stack", h1_style))
    if result.tech_stack:
        story.append(Paragraph("<b>Core Stack Components:</b> " + ", ".join(result.tech_stack), body_style))
    story.append(Spacer(1, 8))

    if hg:
        story.append(Paragraph("7. Engineering Handover and Operational Guide", h1_style))
        story.append(Paragraph("7.1 Local Environment Setup and Prerequisites", h2_style))
        story.append(Paragraph(sanitize_text(hg.local_setup_prerequisites).replace("\n", "<br/>"), body_style))
        story.append(Spacer(1, 6))
        
        if hg.directory_tour:
            story.append(Paragraph("7.2 Subsystem Directory Tour", h2_style))
            dir_data = [[Paragraph("Directory Path", table_header), Paragraph("Architectural Responsibility and Layer", table_header)]]
            for d in hg.directory_tour:
                dir_data.append([Paragraph(f"<code>{d.folder_path}</code>", table_cell_bold), Paragraph(d.architectural_role, table_cell)])
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

        if hg.technical_debt_and_fragility:
            story.append(Paragraph("7.3 Technical Debt and Fragility Priority Warnings", h2_style))
            debt_data = [[Paragraph(f"<b>Priority Warning:</b> {t}", debt_callout)] for t in hg.technical_debt_and_fragility]
            debt_table = Table(debt_data, colWidths=[540])
            debt_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#FEF3C7")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#F59E0B")),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
            ]))
            story.append(debt_table)

    story.append(PageBreak())

    # =========================================================
    # PAGE 6+: Timeline & ADR Records
    # =========================================================
    if getattr(result, "milestone_timeline_mermaid_chart", None):
        story.append(Paragraph("8. Project Evolution and Milestone Timeline", h1_style))
        story.append(Spacer(1, 6))
        time_png_path = render_mermaid_to_png(result.milestone_timeline_mermaid_chart, f"{owner}_{repo}_timeline")
        if time_png_path and os.path.exists(time_png_path):
            story.append(Image(time_png_path, width=540, height=200, kind='proportional'))
        else:
            story.append(Paragraph("<i>(Timeline diagram preview unavailable)</i>", body_style))
        story.append(Spacer(1, 14))

    story.append(Paragraph("9. Architectural Decision Records and Component Knowledge", h1_style))
    grouped_items = defaultdict(list)
    for item in result.knowledge_items:
        grouped_items[item.knowledge_type].append(item)

    for ktype, kitems in grouped_items.items():
        domain_title = ktype.replace('_', ' ').title()
        story.append(Paragraph(f"Domain: {domain_title}", h2_style))
        for idx, item in enumerate(kitems, 1):
            impact = getattr(item, 'business_impact', 'Medium')
            conf = int(item.confidence * 100)
            module = item.module or "Core Subsystem"
            story.append(Paragraph(f"<b>{idx}. {item.title}</b> &nbsp;|&nbsp; <font color='#64748B'>[{module}] &nbsp;•&nbsp; Impact: {impact} &nbsp;•&nbsp; Confidence: {conf}%</font>", h2_style))
            story.append(Paragraph(f"<b>Executive Summary:</b> {item.summary}", body_style))
            if item.details:
                story.append(Paragraph(f"<b>Technical Rationale:</b> {item.details}", body_style))
            if item.evidence_ids:
                story.append(Paragraph(f"<b>Code Verification Pointers:</b> <code>{', '.join(item.evidence_ids)}</code>", bullet_style))
            story.append(Spacer(1, 4))
        story.append(Spacer(1, 6))

    doc.build(story)
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data
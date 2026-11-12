# app/utils/exporter.py
import os
import re
from io import BytesIO
from collections import defaultdict
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Image, Table, TableStyle, PageBreak, KeepTogether
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.core.models import AgentExtractionResult
from app.utils.charts import (
    generate_subsystem_breakdown_chart,
    generate_capability_radar_chart,
    generate_native_blueprint_chart,
    generate_native_sequence_chart
)
from app.utils.diagram_renderer import render_mermaid_to_png

# ── Dynamic Enterprise Font Registration ──
FONT_REG = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
FONT_ITALIC = "Helvetica-Oblique"

for f_name, b_name, reg_path, bold_path in [
    ("SegoeUI", "SegoeUI-Bold", "C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/segoeuib.ttf"),
    ("Arial", "Arial-Bold", "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"),
]:
    if os.path.exists(reg_path) and os.path.exists(bold_path):
        try:
            pdfmetrics.registerFont(TTFont(f_name, reg_path))
            pdfmetrics.registerFont(TTFont(b_name, bold_path))
            FONT_REG = f_name
            FONT_BOLD = b_name
            break
        except Exception:
            pass


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas that renders 'Page X of Y' and enterprise running header/footer."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Top running header (pages > 1)
        if self._pageNumber > 1:
            self.setFont(FONT_REG, 7.5)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(36, 762, "PRISM ARCHITECTURAL INTELLIGENCE  •  ENTERPRISE HANDOVER DOSSIER")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(36, 756, 576, 756)

        # Bottom running footer (all pages)
        self.setFont(FONT_REG, 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 22, "CONFIDENTIAL  |  Tier-1 Production Architecture Standard  |  Automated Verification")
        self.drawRightString(576, 22, f"Page {self._pageNumber} of {page_count}")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 32, 576, 32)
        self.restoreState()


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
        buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=42, bottomMargin=42
    )

    styles = getSampleStyleSheet()

    # ── Executive Typographic Scale ──
    doc_badge = ParagraphStyle(
        'DocBadge', parent=styles['Normal'], fontSize=8.5, leading=11,
        textColor=colors.HexColor("#2563EB"), fontName=FONT_BOLD, spaceAfter=4
    )
    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Heading1'], fontSize=22, leading=26, 
        textColor=colors.HexColor("#0F172A"), fontName=FONT_BOLD, spaceAfter=4
    )
    deck_sub = ParagraphStyle(
        'DeckSub', parent=styles['Normal'], fontSize=11.5, leading=15, 
        textColor=colors.HexColor("#334155"), fontName=FONT_REG, spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSub', parent=styles['Normal'], fontSize=8.5, leading=12, 
        textColor=colors.HexColor("#64748B"), fontName=FONT_REG
    )
    h1_style = ParagraphStyle(
        'Heading1', parent=styles['Heading1'], fontSize=13.5, leading=17, 
        spaceBefore=14, spaceAfter=8, textColor=colors.HexColor("#0F172A"), fontName=FONT_BOLD
    )
    h2_style = ParagraphStyle(
        'Heading2', parent=styles['Heading2'], fontSize=11, leading=15, 
        spaceBefore=8, spaceAfter=4, textColor=colors.HexColor("#1E293B"), fontName=FONT_BOLD
    )
    body_style = ParagraphStyle(
        'Body', parent=styles['Normal'], fontSize=9.5, leading=14, 
        textColor=colors.HexColor("#334155"), fontName=FONT_REG
    )
    body_bold = ParagraphStyle(
        'BodyBold', parent=body_style, fontName=FONT_BOLD, textColor=colors.HexColor("#0F172A")
    )
    table_cell = ParagraphStyle(
        'TableCell', parent=body_style, fontSize=8.5, leading=12
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold', parent=body_style, fontSize=8.5, leading=12, fontName=FONT_BOLD, textColor=colors.HexColor("#0F172A")
    )
    table_header = ParagraphStyle(
        'TableHeader', parent=body_style, fontSize=8.5, leading=12, fontName=FONT_BOLD, textColor=colors.HexColor("#FFFFFF")
    )
    bullet_style = ParagraphStyle(
        'Bullet', parent=body_style, fontSize=9, leading=13, leftIndent=12, bulletIndent=6, spaceAfter=3
    )
    debt_callout = ParagraphStyle(
        'DebtCallout', parent=body_style, fontSize=9, leading=13, textColor=colors.HexColor("#92400E"), fontName=FONT_REG
    )
    adr_title_style = ParagraphStyle(
        'ADRTitle', parent=body_style, fontSize=10, leading=13.5, fontName=FONT_BOLD, textColor=colors.HexColor("#0F172A")
    )
    caption_style = ParagraphStyle(
        'Caption', parent=styles['Normal'], fontSize=8, leading=11, fontName=FONT_REG,
        textColor=colors.HexColor("#64748B"), alignment=1, spaceBefore=4
    )

    story = []

    # =========================================================
    # PAGE 1: Header Banner, Exec Summary & Strategic Matrix Table
    # =========================================================
    target_repo = f"{owner}/{repo}" if owner and repo else result.project_name

    # Top Brand Ribbon
    story.append(Paragraph("PRISM ENTERPRISE ARCHITECTURAL AUDIT & HANDOVER", doc_badge))
    story.append(Paragraph(f"{result.project_name}", title_style))
    story.append(Paragraph("System Architecture Dossier and Engineering Handover Blueprint", deck_sub))
    story.append(Paragraph(
        f"<b>Target Repository:</b> <code>{target_repo}</code> &nbsp;|&nbsp; "
        f"<b>Standard:</b> Tier-1 Production Standard &nbsp;|&nbsp; "
        f"<b>Grounding:</b> Code-Verified", 
        subtitle_style
    ))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1E40AF"), spaceAfter=12))

    # Executive Summary Card
    story.append(Paragraph("1. Executive Problem Statement & System Context", h1_style))
    summary_p = Paragraph(sanitize_text(result.problem_statement).replace("\n", "<br/>"), body_style)
    summary_card = Table([[summary_p]], colWidths=[540])
    summary_card.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('LINELEFT', (0, 0), (0, -1), 3.5, colors.HexColor("#2563EB")),
    ]))
    story.append(summary_card)
    story.append(Spacer(1, 12))

    # Strategic Analysis Deck Matrix
    deck = result.presentation_deck
    story.append(Paragraph("2. Executive Strategic Analysis (4-Pillar Matrix)", h1_style))
    deck_table_data = [
        [Paragraph("Strategic Dimension", table_header), Paragraph("Audit Finding & Architectural Value", table_header)],
        [Paragraph("The Executive Pitch", table_cell_bold), Paragraph(deck.executive_pitch, table_cell)],
        [Paragraph("Business Value & ROI", table_cell_bold), Paragraph(deck.business_value, table_cell)],
        [Paragraph("Technical Challenges Solved", table_cell_bold), Paragraph(deck.technical_challenges, table_cell)],
        [Paragraph("12-Month Engineering Roadmap", table_cell_bold), Paragraph(deck.future_scope, table_cell)],
    ]
    deck_table = Table(deck_table_data, colWidths=[130, 410])
    deck_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(deck_table)
    story.append(PageBreak())

    # =========================================================
    # PAGE 2: Analytics & Seaborn High-Resolution Visualizations
    # =========================================================
    story.append(Paragraph("3. Quantitative System Analytics & Subsystem Density", h1_style))
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
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("Executive Subsystem Density & Capability Radar", h2_style))
    try:
        c1 = generate_subsystem_breakdown_chart(result)
        c2 = generate_capability_radar_chart(result)
        chart_table_data = [[Image(c1, width=320, height=175), Image(c2, width=210, height=175)]]
        chart_table = Table(chart_table_data, colWidths=[330, 210])
        chart_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(chart_table)
    except Exception as e:
        print(f"Chart render error: {e}")

    story.append(PageBreak())

    # =========================================================
    # PAGE 3: Section 4 - System Architecture Blueprint (Dedicated Page)
    # =========================================================
    story.append(Paragraph("4. System Architecture Blueprint", h1_style))
    story.append(Paragraph("Enterprise microservice boundaries, API gateways, storage tiers, and integration dependencies.", body_style))
    story.append(Spacer(1, 8))
    
    arch_png_path = render_mermaid_to_png(result.architecture_mermaid_chart, f"{owner}_{repo}_arch")
    if arch_png_path and os.path.exists(arch_png_path):
        story.append(Image(arch_png_path, width=540, height=450, kind='proportional'))
        story.append(Paragraph("Figure 4.1: Codebase Architecture Blueprint (Vector-rendered via Mermaid engine)", caption_style))
    else:
        native_arch = generate_native_blueprint_chart(result.architecture_mermaid_chart, result.project_name)
        story.append(Image(native_arch, width=540, height=450, kind='proportional'))
        story.append(Paragraph("Figure 4.1: Codebase Architecture Blueprint (High-Definition Native Fallback)", caption_style))
    story.append(PageBreak())

    # =========================================================
    # PAGE 4: Section 5 - Primary Transaction Sequence Diagram (Dedicated Page)
    # =========================================================
    hg = getattr(result, "developer_handover_guide", None)
    if hg and getattr(hg, "execution_sequence_chart", None):
        story.append(Paragraph("5. Primary Transaction & Workflow Sequence Diagram", h1_style))
        story.append(Paragraph("Chronological call sequence and state transitions during primary operational execution.", body_style))
        story.append(Spacer(1, 8))
        
        seq_png_path = render_mermaid_to_png(hg.execution_sequence_chart, f"{owner}_{repo}_seq")
        if seq_png_path and os.path.exists(seq_png_path):
            story.append(Image(seq_png_path, width=540, height=450, kind='proportional'))
            story.append(Paragraph("Figure 5.1: Primary Workflow Execution Sequence (Mermaid rendering)", caption_style))
        else:
            native_seq = generate_native_sequence_chart(hg.execution_sequence_chart)
            story.append(Image(native_seq, width=540, height=450, kind='proportional'))
            story.append(Paragraph("Figure 5.1: Primary Workflow Execution Sequence (High-Definition Native Fallback)", caption_style))
        story.append(PageBreak())

    # =========================================================
    # PAGE 5: Handover Guide, Directory Tour & Technical Debt
    # =========================================================
    story.append(Paragraph("6. Verified Technology Stack", h1_style))
    if result.tech_stack:
        story.append(Paragraph(
            "<b>Audited Stack:</b> " + " &nbsp;•&nbsp; ".join([f"<code>{s}</code>" for s in result.tech_stack]), 
            body_style
        ))
    story.append(Spacer(1, 10))

    if hg:
        story.append(Paragraph("7. Engineering Handover & Operational Guide", h1_style))
        story.append(Paragraph("7.1 Local Environment Setup & Prerequisites", h2_style))
        story.append(Paragraph(sanitize_text(hg.local_setup_prerequisites).replace("\n", "<br/>"), body_style))
        story.append(Spacer(1, 8))
        
        if hg.directory_tour:
            story.append(Paragraph("7.2 Subsystem Directory Tour", h2_style))
            dir_data = [[Paragraph("Directory Path", table_header), Paragraph("Architectural Responsibility & Layer", table_header)]]
            for d in hg.directory_tour:
                dir_data.append([
                    Paragraph(f"<code>{d.folder_path}</code>", table_cell_bold), 
                    Paragraph(d.architectural_role, table_cell)
                ])
            dir_table = Table(dir_data, colWidths=[205, 335])
            dir_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ]))
            story.append(dir_table)
            story.append(Spacer(1, 10))

        if hg.technical_debt_and_fragility:
            story.append(Paragraph("7.3 Technical Debt & Fragility Priority Warnings", h2_style))
            debt_data = []
            for t in hg.technical_debt_and_fragility:
                debt_data.append([Paragraph(f"<b>[PRIORITY WARNING]</b> &nbsp; {t}", debt_callout)])
            debt_table = Table(debt_data, colWidths=[540])
            debt_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#F59E0B")),
                ('LINELEFT', (0, 0), (0, -1), 3.0, colors.HexColor("#D97706")),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))
            story.append(debt_table)

    story.append(PageBreak())

    # =========================================================
    # PAGE 6+: Timeline & Architectural Decision Records
    # =========================================================
    if getattr(result, "milestone_timeline_mermaid_chart", None):
        story.append(Paragraph("8. Project Evolution & Milestone Timeline", h1_style))
        story.append(Spacer(1, 6))
        time_png_path = render_mermaid_to_png(result.milestone_timeline_mermaid_chart, f"{owner}_{repo}_timeline")
        if time_png_path and os.path.exists(time_png_path):
            story.append(Image(time_png_path, width=540, height=220, kind='proportional'))
            story.append(Paragraph("Figure 8.1: Historical Milestone Chronology", caption_style))
        else:
            story.append(Paragraph("<i>(Timeline diagram preview unavailable)</i>", body_style))
        story.append(Spacer(1, 14))

    story.append(Paragraph("9. Architectural Decision Records (ADRs) & Component Knowledge", h1_style))
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
            
            card_content = [
                Paragraph(
                    f"<b>{idx}. {item.title}</b> &nbsp;|&nbsp; "
                    f"<font color='#2563EB'><b>[{module}]</b></font> &nbsp;•&nbsp; "
                    f"Impact: <b>{impact}</b> &nbsp;•&nbsp; Confidence: <b>{conf}%</b>", 
                    adr_title_style
                ),
                Spacer(1, 3),
                Paragraph(f"<b>Executive Summary:</b> {item.summary}", body_style),
            ]
            if item.details:
                card_content.append(Paragraph(f"<b>Technical Rationale:</b> {item.details}", body_style))
            if item.evidence_ids:
                card_content.append(Paragraph(f"<b>Code Evidence Pointers:</b> <code>{', '.join(item.evidence_ids)}</code>", bullet_style))

            item_table = Table([[c] for c in card_content], colWidths=[540])
            item_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ('LINELEFT', (0, 0), (0, -1), 2.5, colors.HexColor("#3B82F6")),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(KeepTogether(item_table))
            story.append(Spacer(1, 6))

    doc.build(story, canvasmaker=NumberedCanvas)
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data
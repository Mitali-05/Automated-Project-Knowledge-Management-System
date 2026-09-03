# app/exporter.py
from io import BytesIO
from typing import List
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from app.models import KnowledgeItem

def generate_pdf_report(repo_name: str, items: List[KnowledgeItem]) -> bytes:
    """Generates an formatted PDF document of extracted knowledge items."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontSize=20, leading=24, textColor=colors.HexColor("#1E293B"))
    meta_style = ParagraphStyle('MetaText', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor("#64748B"))
    item_title_style = ParagraphStyle('ItemTitle', parent=styles['Heading2'], fontSize=12, leading=16, textColor=colors.HexColor("#0F172A"))
    body_style = ParagraphStyle('ItemBody', parent=styles['Normal'], fontSize=10, leading=14, textColor=colors.HexColor("#334155"))
    tag_style = ParagraphStyle('TagText', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor("#2563EB"))

    story = []

    # Document Header
    story.append(Paragraph(f"Knowledge Extraction Report", title_style))
    story.append(Paragraph(f"Repository: {repo_name} | Total Items Extracted: {len(items)}", meta_style))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=15))

    # Loop through Extracted Knowledge
    for idx, item in enumerate(items, 1):
        # Header Row for Each Item
        category_label = item.category.value if hasattr(item.category, 'value') else str(item.category)
        title_text = f"<b>{idx}. {item.title}</b> <font color='#64748B'>[{category_label}]</font>"
        story.append(Paragraph(title_text, item_title_style))
        story.append(Spacer(1, 4))
        
        # Summary Content
        story.append(Paragraph(item.summary, body_style))
        story.append(Spacer(1, 6))

        # Citations / Evidence Section
        if item.evidence_ids:
            evidence_str = "<b>Evidence References:</b> " + ", ".join([f"<code>{e}</code>" for e in item.evidence_ids])
            story.append(Paragraph(evidence_str, tag_style))

        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

    # Build PDF
    doc.build(story)
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data
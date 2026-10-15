# app/utils/pptx_exporter.py
import os
import re
from io import BytesIO
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from app.core.models import AgentExtractionResult
from app.utils.charts import (
    generate_subsystem_breakdown_chart,
    generate_capability_radar_chart,
    generate_native_blueprint_chart,
    generate_native_sequence_chart
)
from app.utils.diagram_renderer import render_mermaid_to_png

# Executive Corporate Palette
BG_DARK = RGBColor(11, 17, 32)        # #0B1120
CARD_BG = RGBColor(15, 23, 42)       # #0F172A
TEXT_LIGHT = RGBColor(248, 250, 252)  # #F8FAFC
TEXT_MUTED = RGBColor(148, 163, 184) # #94A3B8
ACCENT_BLUE = RGBColor(56, 189, 248) # #38BDF8
BORDER_COLOR = RGBColor(51, 65, 85)  # #334155

def sanitize_text(text: str) -> str:
    """Masks production secrets and keys from presentation slides."""
    if not text:
        return ""
    text = re.sub(r'(MONGODB_URI=)[^\s,]+', r'\1mongodb+srv://[REDACTED]', text)
    text = re.sub(r'(SMTP_PASS=)[^\s,]+', r'\1[REDACTED_PASSWORD]', text)
    text = re.sub(r'(JWT_SECRET=)[^\s,]+', r'\1[REDACTED_SECRET]', text)
    text = re.sub(r'(DB_PASSWORD=)[^\s,]+', r'\1[REDACTED_PASSWORD]', text)
    return text

def set_slide_background(slide, prs):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG_DARK
    bg.line.color.rgb = BG_DARK
    return bg

def add_header(slide, title_text: str, category_text: str = "PRISM ARCHITECTURAL AUDIT"):
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.9))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p_cat = tf.paragraphs[0]
    p_cat.text = category_text.upper()
    p_cat.font.size = Pt(9)
    p_cat.font.bold = True
    p_cat.font.color.rgb = ACCENT_BLUE
    p_cat.font.name = "Arial"
    
    p_title = tf.add_paragraph()
    p_title.text = title_text
    p_title.font.size = Pt(20)
    p_title.font.bold = True
    p_title.font.color.rgb = TEXT_LIGHT
    p_title.font.name = "Arial"

def add_card(slide, left, top, width, height, title: str, body_text: str, font_size: float = 9.5):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = CARD_BG
    card.line.color.rgb = BORDER_COLOR
    card.line.width = Pt(1)
    
    tb = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.2), width - Inches(0.4), height - Inches(0.4))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p_title = tf.paragraphs[0]
    p_title.text = title.upper()
    p_title.font.size = Pt(10.5)
    p_title.font.bold = True
    p_title.font.color.rgb = ACCENT_BLUE
    p_title.font.name = "Arial"
    
    p_body = tf.add_paragraph()
    p_body.text = sanitize_text(body_text)
    p_body.font.size = Pt(font_size)
    p_body.font.color.rgb = TEXT_LIGHT
    p_body.font.name = "Arial"
    p_body.space_before = Pt(5)

def generate_pptx_deck(result: AgentExtractionResult, owner: str = "", repo: str = "") -> bytes:
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]
    target_repo = f"{owner}/{repo}" if owner and repo else result.project_name
    deck = result.presentation_deck
    hg = getattr(result, "developer_handover_guide", None)

    # 1. Cover Slide
    slide1 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide1, prs)
    t_box = slide1.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(11.3), Inches(3.0))
    tf1 = t_box.text_frame
    tf1.word_wrap = True
    
    p_badge = tf1.paragraphs[0]
    p_badge.text = "ENTERPRISE ARCHITECTURAL AUDIT & HANDOVER DECK"
    p_badge.font.size = Pt(11)
    p_badge.font.bold = True
    p_badge.font.color.rgb = ACCENT_BLUE
    p_badge.font.name = "Arial"
    
    p_main = tf1.add_paragraph()
    p_main.text = result.project_name
    p_main.font.size = Pt(36)
    p_main.font.bold = True
    p_main.font.color.rgb = TEXT_LIGHT
    p_main.font.name = "Arial"
    p_main.space_before = Pt(8)
    
    p_sub = tf1.add_paragraph()
    p_sub.text = f"Target Repository: {target_repo}  |  Standard: Production Architecture Audit"
    p_sub.font.size = Pt(13)
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.font.name = "Arial"
    p_sub.space_before = Pt(10)

    # 2. Executive Mission & Strategic Impact
    slide2 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide2, prs)
    add_header(slide2, "Executive Mission & Problem Statement")
    add_card(slide2, Inches(0.8), Inches(1.5), Inches(5.7), Inches(5.3), 
             "Problem Statement & System Context", result.problem_statement, font_size=9.5)
    add_card(slide2, Inches(6.8), Inches(1.5), Inches(5.7), Inches(5.3), 
             "Strategic Return on Investment (ROI)", f"Executive Summary:\n{deck.executive_pitch}\n\nQuantified Business Value:\n{deck.business_value}", font_size=9.5)

    # 3. Strategy Matrix (4 Pillars)
    slide3 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide3, prs)
    add_header(slide3, "Strategic Architectural Deck Matrix")
    add_card(slide3, Inches(0.8), Inches(1.5), Inches(5.7), Inches(2.55), "1. Executive Pitch", deck.executive_pitch, font_size=9)
    add_card(slide3, Inches(6.8), Inches(1.5), Inches(5.7), Inches(2.55), "2. Quantified Business Impact", deck.business_value, font_size=9)
    add_card(slide3, Inches(0.8), Inches(4.3), Inches(5.7), Inches(2.55), "3. Technical Challenges Solved", deck.technical_challenges, font_size=9)
    add_card(slide3, Inches(6.8), Inches(4.3), Inches(5.7), Inches(2.55), "4. 12-Month Engineering Roadmap", deck.future_scope, font_size=9)

    # 4. Quantitative Analytics & Capability Radar
    slide4 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide4, prs)
    add_header(slide4, "Quantitative Analytics & Subsystem Density")
    metrics = result.analytics_metrics
    kpis = [
        ("SYSTEM COMPLEXITY", metrics.estimated_complexity),
        ("AUDITED SUBSYSTEMS", f"{metrics.core_module_count} Modules"),
        ("SECURITY MODEL", metrics.security_posture.split(',')[0][:22]),
        ("KNOWLEDGE NODES", f"{len(result.knowledge_items)} Nodes")
    ]
    for i, (k_label, k_val) in enumerate(kpis):
        left_pos = Inches(0.8 + i * 2.95)
        k_card = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_pos, Inches(1.4), Inches(2.8), Inches(1.0))
        k_card.fill.solid()
        k_card.fill.fore_color.rgb = CARD_BG
        k_card.line.color.rgb = BORDER_COLOR
        
        tb_k = slide4.shapes.add_textbox(left_pos + Inches(0.15), Inches(1.45), Inches(2.5), Inches(0.9))
        p1 = tb_k.text_frame.paragraphs[0]
        p1.text = k_label
        p1.font.size = Pt(8)
        p1.font.bold = True
        p1.font.color.rgb = TEXT_MUTED
        
        p2 = tb_k.text_frame.add_paragraph()
        p2.text = k_val
        p2.font.size = Pt(13)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_LIGHT

    try:
        c1_buf = generate_subsystem_breakdown_chart(result)
        slide4.shapes.add_picture(c1_buf, Inches(0.8), Inches(2.6), Inches(7.2), Inches(4.3))
    except Exception:
        pass

    try:
        c2_buf = generate_capability_radar_chart(result)
        slide4.shapes.add_picture(c2_buf, Inches(8.3), Inches(2.6), Inches(4.2), Inches(4.3))
    except Exception:
        pass

    # 5. System Architecture Blueprint (Saved PNG to Disk)
    slide5 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide5, prs)
    add_header(slide5, "System Architecture Blueprint")
    
    arch_png_path = render_mermaid_to_png(result.architecture_mermaid_chart, f"{owner}_{repo}_arch")
    if arch_png_path and os.path.exists(arch_png_path):
        slide5.shapes.add_picture(arch_png_path, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.3))
    else:
        native_arch = generate_native_blueprint_chart(result.architecture_mermaid_chart, result.project_name)
        slide5.shapes.add_picture(native_arch, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.3))

    # 6. Primary Sequence Diagram (Saved PNG to Disk)
    if hg and getattr(hg, "execution_sequence_chart", None):
        slide6 = prs.slides.add_slide(blank_layout)
        set_slide_background(slide6, prs)
        add_header(slide6, "Primary Transaction & Workflow Sequence")
        
        seq_png_path = render_mermaid_to_png(hg.execution_sequence_chart, f"{owner}_{repo}_seq")
        if seq_png_path and os.path.exists(seq_png_path):
            slide6.shapes.add_picture(seq_png_path, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.3))
        else:
            native_seq = generate_native_sequence_chart(hg.execution_sequence_chart)
            slide6.shapes.add_picture(native_seq, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.3))

    # 7. Milestone Timeline (Saved PNG to Disk)
    if getattr(result, "milestone_timeline_mermaid_chart", None):
        slide7 = prs.slides.add_slide(blank_layout)
        set_slide_background(slide7, prs)
        add_header(slide7, "Architectural Evolution & Milestone Timeline")
        
        time_png_path = render_mermaid_to_png(result.milestone_timeline_mermaid_chart, f"{owner}_{repo}_timeline")
        if time_png_path and os.path.exists(time_png_path):
            slide7.shapes.add_picture(time_png_path, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.3))
        else:
            add_card(slide7, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.3),
                     "System Milestones", result.milestone_timeline_mermaid_chart, font_size=8.5)

    # 8. Local Setup Prerequisites (Dedicated Slide to Prevent Overflow)
    if hg and hg.local_setup_prerequisites:
        slide8 = prs.slides.add_slide(blank_layout)
        set_slide_background(slide8, prs)
        add_header(slide8, "Engineering Handover: Setup & Execution")
        add_card(slide8, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.3),
                 "Local Setup Prerequisites & Configuration", hg.local_setup_prerequisites, font_size=9)

    # 9. Subsystem Directory Tour (Dedicated Slide to Prevent Overflow)
    if hg and hg.directory_tour:
        slide9 = prs.slides.add_slide(blank_layout)
        set_slide_background(slide9, prs)
        add_header(slide9, "Subsystem Directory Tour")
        dir_text = ""
        for d in hg.directory_tour[:10]:
            dir_text += f"• {d.folder_path}\n   {d.architectural_role}\n\n"
        add_card(slide9, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.3),
                 "Audited Functional Components", dir_text.strip(), font_size=8.5)

    # 10. Technical Debt & Verified Stack
    slide10 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide10, prs)
    add_header(slide10, "Technical Debt & Verified Technology Stack")
    debt_content = ""
    if hg and hg.technical_debt_and_fragility:
        for t in hg.technical_debt_and_fragility:
            debt_content += f"• [PRIORITY WARNING] {t}\n\n"
    else:
        debt_content = "No high-severity technical fragility identified."
    add_card(slide10, Inches(0.8), Inches(1.5), Inches(6.5), Inches(5.3),
             "Technical Debt Priority Warnings", debt_content.strip(), font_size=9)
    
    stack_content = f"Core Stack Components:\n{', '.join(result.tech_stack)}\n\n"
    stack_content += f"Architectural Patterns Detected:\n{', '.join(result.analytics_metrics.key_patterns_used)}\n\n"
    stack_content += f"Security Posture:\n{result.analytics_metrics.security_posture}"
    add_card(slide10, Inches(7.6), Inches(1.5), Inches(4.9), Inches(5.3),
             "Verified Technology Stack & Patterns", stack_content.strip(), font_size=9)

    out_buf = BytesIO()
    prs.save(out_buf)
    out_buf.seek(0)
    return out_buf.getvalue()
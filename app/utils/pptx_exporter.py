# app/utils/pptx_exporter.py
from io import BytesIO
import base64
import requests
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from app.core.models import AgentExtractionResult
from app.utils.charts import generate_subsystem_breakdown_chart, generate_capability_radar_chart

# Executive Corporate Color Palette (Slate, Navy, White, Amber)
BG_DARK = RGBColor(11, 17, 32)        # #0B1120
CARD_BG = RGBColor(15, 23, 42)       # #0F172A
TEXT_LIGHT = RGBColor(248, 250, 252)  # #F8FAFC
TEXT_MUTED = RGBColor(148, 163, 184) # #94A3B8
ACCENT_BLUE = RGBColor(56, 189, 248) # #38BDF8
ACCENT_NAVY = RGBColor(37, 99, 235)  # #2563EB
BORDER_COLOR = RGBColor(51, 65, 85)  # #334155
WARNING_BG = RGBColor(69, 26, 3)     # #451A03
WARNING_BORDER = RGBColor(245, 158, 11) # #F59E0B
WARNING_TEXT = RGBColor(253, 230, 138)  # #FDE68A

def get_mermaid_image_bytes(mermaid_text: str):
    """Fetches high-res rendered image of Mermaid diagram with clean white background."""
    if not mermaid_text or not mermaid_text.strip():
        return None
    try:
        encoded = base64.b64encode(mermaid_text.strip().encode('utf-8')).decode('utf-8')
        url = f"https://mermaid.ink/img/{encoded}?bgColor=!white&scale=3"
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            return BytesIO(resp.content)
    except Exception:
        pass
    return None

def set_slide_background(slide, prs):
    """Adds a dark slate background to the slide."""
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG_DARK
    bg.line.color.rgb = BG_DARK
    return bg

def add_header(slide, title_text: str, category_text: str = "PRISM ARCHITECTURAL AUDIT"):
    """Adds a standardized enterprise header to a slide."""
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.9))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    
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

def add_card(slide, left, top, width, height, title: str, body_text: str):
    """Adds a sleek container card with title and body."""
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = CARD_BG
    card.line.color.rgb = BORDER_COLOR
    card.line.width = Pt(1)
    
    tb = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.2), width - Inches(0.4), height - Inches(0.4))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    
    p_title = tf.paragraphs[0]
    p_title.text = title.upper()
    p_title.font.size = Pt(11)
    p_title.font.bold = True
    p_title.font.color.rgb = ACCENT_BLUE
    p_title.font.name = "Arial"
    
    p_body = tf.add_paragraph()
    p_body.text = body_text
    p_body.font.size = Pt(10)
    p_body.font.color.rgb = TEXT_LIGHT
    p_body.font.name = "Arial"
    p_body.space_before = Pt(6)

def generate_pptx_deck(result: AgentExtractionResult, owner: str = "", repo: str = "") -> bytes:
    """Generates an authentic 16:9 widescreen PowerPoint presentation deck (.pptx)."""
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]
    target_repo = f"{owner}/{repo}" if owner and repo else result.project_name
    deck = result.presentation_deck
    hg = getattr(result, "developer_handover_guide", None)

    # -------------------------------------------------------------
    # SLIDE 1: Title & Cover Slide
    # -------------------------------------------------------------
    slide1 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide1, prs)
    
    # Title Box
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
    p_sub.text = f"Target Repository: {target_repo}  |  Standard: Tier-1 Production Audit"
    p_sub.font.size = Pt(13)
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.font.name = "Arial"
    p_sub.space_before = Pt(10)

    # -------------------------------------------------------------
    # SLIDE 2: Executive Summary & The Pitch
    # -------------------------------------------------------------
    slide2 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide2, prs)
    add_header(slide2, "Executive Mission & Problem Statement")
    
    add_card(slide2, Inches(0.8), Inches(1.5), Inches(5.7), Inches(5.3), 
             "Problem Statement & System Context", result.problem_statement)
    add_card(slide2, Inches(6.8), Inches(1.5), Inches(5.7), Inches(5.3), 
             "The Executive Elevator Pitch", f"{deck.executive_pitch}\n\nStrategic ROI:\n{deck.business_value}")

    # -------------------------------------------------------------
    # SLIDE 3: Strategic Executive Deck Matrix (4 Pillars)
    # -------------------------------------------------------------
    slide3 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide3, prs)
    add_header(slide3, "Strategic Architectural Deck Matrix")
    
    add_card(slide3, Inches(0.8), Inches(1.5), Inches(5.7), Inches(2.55), 
             "1. Executive Pitch", deck.executive_pitch)
    add_card(slide3, Inches(6.8), Inches(1.5), Inches(5.7), Inches(2.55), 
             "2. Business Value & Financial ROI", deck.business_value)
    add_card(slide3, Inches(0.8), Inches(4.3), Inches(5.7), Inches(2.55), 
             "3. Critical Technical Challenges Solved", deck.technical_challenges)
    add_card(slide3, Inches(6.8), Inches(4.3), Inches(5.7), Inches(2.55), 
             "4. 12-Month Strategic Roadmap", deck.future_scope)

    # -------------------------------------------------------------
    # SLIDE 4: System Analytics & Data Visualizations
    # -------------------------------------------------------------
    slide4 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide4, prs)
    add_header(slide4, "Quantitative Analytics & Subsystem Density")
    
    # 4 Top KPI mini cards
    metrics = result.analytics_metrics
    kpis = [
        ("SYSTEM COMPLEXITY", metrics.estimated_complexity),
        ("CORE SUBSYSTEMS", f"{metrics.core_module_count} Modules"),
        ("SECURITY MODEL", metrics.security_posture.split(',')[0][:20]),
        ("KNOWLEDGE NODES", f"{len(result.knowledge_items)} Nodes")
    ]
    for i, (k_label, k_val) in enumerate(kpis):
        left_pos = Inches(0.8 + i * 2.95)
        k_card = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_pos, Inches(1.4), Inches(2.8), Inches(1.0))
        k_card.fill.solid()
        k_card.fill.fore_color.rgb = CARD_BG
        k_card.line.color.rgb = BORDER_COLOR
        
        tb_k = slide4.shapes.add_textbox(left_pos + Inches(0.15), Inches(1.45), Inches(2.5), Inches(0.9))
        tf_k = tb_k.text_frame
        p1 = tf_k.paragraphs[0]
        p1.text = k_label
        p1.font.size = Pt(8)
        p1.font.bold = True
        p1.font.color.rgb = TEXT_MUTED
        
        p2 = tf_k.add_paragraph()
        p2.text = k_val
        p2.font.size = Pt(13)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_LIGHT

    # Embed Visual Data Charts generated via Matplotlib
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

    # -------------------------------------------------------------
    # SLIDE 5: System Architecture Blueprint
    # -------------------------------------------------------------
    if result.architecture_mermaid_chart:
        slide5 = prs.slides.add_slide(blank_layout)
        set_slide_background(slide5, prs)
        add_header(slide5, "System Architecture Blueprint")
        
        arch_img_buf = get_mermaid_image_bytes(result.architecture_mermaid_chart)
        if arch_img_buf:
            slide5.shapes.add_picture(arch_img_buf, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.3))
        else:
            add_card(slide5, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.3),
                     "Architecture Overview", "Mermaid architecture diagram vector available in PDF report.")

    # -------------------------------------------------------------
    # SLIDE 6: Critical Workflow Sequence Diagram
    # -------------------------------------------------------------
    if hg and getattr(hg, "execution_sequence_chart", None):
        slide6 = prs.slides.add_slide(blank_layout)
        set_slide_background(slide6, prs)
        add_header(slide6, "Primary Transaction & Workflow Sequence")
        
        seq_img_buf = get_mermaid_image_bytes(hg.execution_sequence_chart)
        if seq_img_buf:
            slide6.shapes.add_picture(seq_img_buf, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.3))

    # -------------------------------------------------------------
    # SLIDE 7: Engineering Handover & Subsystem Tour
    # -------------------------------------------------------------
    if hg:
        slide7 = prs.slides.add_slide(blank_layout)
        set_slide_background(slide7, prs)
        add_header(slide7, "Engineering Handover & Subsystem Directory Tour")
        
        add_card(slide7, Inches(0.8), Inches(1.4), Inches(11.7), Inches(1.5),
                 "Local Setup Prerequisites & Execution", hg.local_setup_prerequisites)
        
        # Directory Tour Card
        dir_text = ""
        for d in hg.directory_tour[:6]:
            dir_text += f"• {d.folder_path}: {d.architectural_role}\n"
        add_card(slide7, Inches(0.8), Inches(3.1), Inches(11.7), Inches(3.8),
                 "Subsystem Directory Tour", dir_text)

    # -------------------------------------------------------------
    # SLIDE 8: Technical Debt & Fragility Priority Warnings
    # -------------------------------------------------------------
    slide8 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide8, prs)
    add_header(slide8, "Technical Debt & Verified Technology Stack")
    
    # Left: Technical Debt
    debt_content = ""
    if hg and hg.technical_debt_and_fragility:
        for t in hg.technical_debt_and_fragility:
            debt_content += f"• [PRIORITY WARNING] {t}\n\n"
    else:
        debt_content = "No high-severity technical fragility identified."
    add_card(slide8, Inches(0.8), Inches(1.5), Inches(6.5), Inches(5.3),
             "Technical Debt Priority Warnings", debt_content)
    
    # Right: Verified Stack & Patterns
    stack_content = f"Core Stack Components:\n{', '.join(result.tech_stack)}\n\n"
    stack_content += f"Architectural Patterns Detected:\n{', '.join(result.analytics_metrics.key_patterns_used)}\n\n"
    stack_content += f"Security Posture:\n{result.analytics_metrics.security_posture}"
    add_card(slide8, Inches(7.6), Inches(1.5), Inches(4.9), Inches(5.3),
             "Verified Technology Stack & Patterns", stack_content)

    # Save to BytesIO
    out_buf = BytesIO()
    prs.save(out_buf)
    out_buf.seek(0)
    return out_buf.getvalue()

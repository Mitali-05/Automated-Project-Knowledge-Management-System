"""PRISM corporate deck layout. See docs/PRESENTATION_DESIGN.md for the contract."""
import os
import re
from functools import lru_cache
from io import BytesIO
from PIL import Image, ImageFont
from matplotlib import font_manager
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE
import json
from app.core.models import AgentExtractionResult
from app.mcp.inspection_contract import validate_sequence_diagram
from app.utils.diagram_renderer import render_mermaid_to_png, DIAGRAM_TEXT_PX
from app.utils.publication_contract import validate_pptx_publication

FONT_FAMILY = 'Arial'
TYPE_PT = {'cover': 44, 'title': 32, 'section': 24, 'body': 20, 'compact': 18, 'caption': 14, 'footer': 11}
COLORS = {'white': 'FFFFFF', 'navy': '101F3D', 'body': '334155', 'muted': '475569',
          'blue': '0052CC', 'warning': '7A4100', 'warning_bg': 'FFF4D6',
          'success': '006644', 'success_bg': 'E3FCEF'}
SLIDE_W, SLIDE_H, MARGIN = 13.333333, 7.5, .75
CONTENT_W = SLIDE_W - 2 * MARGIN
BODY_TOP, BODY_H, BODY_LEADING, LINES_PER_SLIDE = 1.95, 4.7, 27, 12


def sanitize_text(text: str) -> str:
    text = re.sub(r'((?:MONGODB_URI|SMTP_PASS|JWT_SECRET|DB_PASSWORD)=)[^\s,]+',
                  r'\1[REDACTED]', str(text or ''))
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)


def _textbox(slide, text, x, y, w, h, role='body', color='body', bold=False):
    shape = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = shape.text_frame
    tf.clear()
    tf.word_wrap, tf.auto_size = False, MSO_AUTO_SIZE.NONE
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, line in enumerate(sanitize_text(text).split('\n')):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line
        p.font.name, p.font.size, p.font.bold = FONT_FAMILY, Pt(TYPE_PT[role]), bold
        p.font.color.rgb = RGBColor.from_string(COLORS[color])
        p.space_before = p.space_after = Pt(0)
        p.line_spacing = Pt(BODY_LEADING if role == 'body' else TYPE_PT[role] * 1.2)
    return shape


@lru_cache(maxsize=16)
def _font(size):
    properties = font_manager.FontProperties(family=FONT_FAMILY, weight='bold' if size >= 24 else 'normal')
    path = font_manager.findfont(properties, fallback_to_default=False)
    return ImageFont.truetype(path, round(size * 4))


def _wrap(text, size=20, width=CONTENT_W):
    # Measure the installed typeface with 4x precision and reserve a 5% rendering tolerance.
    font, limit = _font(size), width * 72 * 4 * .95
    lines = []
    for paragraph in sanitize_text(text).splitlines():
        current = ''
        for word in paragraph.split():
            if current and font.getlength(current + ' ' + word) > limit:
                lines.append(current)
                current = ''
            while font.getlength(word) > limit:
                end = 1
                while end < len(word) and font.getlength(word[:end + 1]) <= limit:
                    end += 1
                lines.append(word[:end])
                word = word[end:]
            current = (current + ' ' + word).strip()
        lines.append(current)
    return lines or ['']


def _slide(prs, title, target, section, dark=False):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = RGBColor.from_string(COLORS['navy' if dark else 'white'])
    _textbox(s, section, MARGIN, .30, CONTENT_W, .28, 'caption', 'white' if dark else 'blue', True)
    if title:
        lines = _wrap(title, TYPE_PT['title'])
        if len(lines) > 2:
            lines = lines[:2]
            if lines and not lines[-1].endswith('...'):
                lines[-1] = lines[-1].rstrip('.') + '...'
        _textbox(s, '\n'.join(lines), MARGIN, .70, CONTENT_W, 1.08,
                 'title', 'white' if dark else 'navy', True)
    footer = '\n'.join(_wrap(f'PRISM / {target}', TYPE_PT['footer'], CONTENT_W - 1))
    _textbox(s, footer, MARGIN, 6.94, CONTENT_W - 1, .45, 'footer', 'white' if dark else 'muted')
    return s


def _text_slides(prs, title, text, target, section='Project analysis'):
    if not str(text or '').strip():
        return
    lines = _wrap(text)
    for start in range(0, len(lines), LINES_PER_SLIDE):
        page = start // LINES_PER_SLIDE + 1
        heading = title if page == 1 else f'{title} (continued {page})'
        s = _slide(prs, heading, target, section)
        _textbox(s, '\n'.join(lines[start:start + LINES_PER_SLIDE]), MARGIN, BODY_TOP, CONTENT_W, BODY_H)


def _paired_slides(prs, title, left, right, target, section='Engineering review'):
    """Related sections share a flat two-column composition; overflow paginates."""
    width = (CONTENT_W - .55) / 2
    columns = [_wrap(value or 'Not reported', 18, width) for _, value in (left, right)]
    for start in range(0, max(map(len, columns)), 13):
        page = start // 13 + 1
        s = _slide(prs, title if page == 1 else f'{title} (continued {page})', target, section)
        for i, ((label, _), lines) in enumerate(zip((left, right), columns)):
            x = MARGIN + i * (width + .55)
            _textbox(s, label, x, BODY_TOP, width, .45, 'section', 'blue', True)
            _textbox(s, '\n'.join(lines[start:start + 13]), x, BODY_TOP + .65,
                     width, 3.95, 'compact')


def _notes(slide, text):
    slide.notes_slide.notes_text_frame.text = sanitize_text(text)


def _image_slide(prs, title, image, target, caption):
    s = _slide(prs, title, target, 'Architecture and evidence')
    if hasattr(image, 'seek'):
        image.seek(0)
    with Image.open(image) as im:
        iw, ih = im.size
    if hasattr(image, 'seek'):
        image.seek(0)
    scale = min(CONTENT_W / iw, 4.35 / ih)
    w, h = iw * scale, ih * scale
    s.shapes.add_picture(image, Inches(MARGIN + (CONTENT_W - w) / 2),
                         Inches(BODY_TOP + (4.35 - h) / 2), Inches(w), Inches(h))
    _textbox(s, caption, MARGIN, 6.48, CONTENT_W, .32, 'caption', 'muted')


def validate_diagram_geometry(width, height, title, min_pt=18):
    nominal_font = DIAGRAM_TEXT_PX * min(CONTENT_W * 72 / width, 4.35 * 72 / height)
    width_font = DIAGRAM_TEXT_PX * (CONTENT_W * 72 / width)
    if nominal_font < min_pt:
        if height > width and width_font >= 14 and nominal_font >= 6.5:
            return nominal_font
        raise ValueError(f'Diagram is too dense for readable slides: {title}. '
                         f'Rendered {width} x {height}px; fitting it gives approximately {nominal_font:.1f}pt '
                         f'text (minimum {min_pt}pt). Use shorter labels or separate focused views; preserve the source interactions.')
    return nominal_font


def _diagram_slide(prs, title, code, key, target, image_path=None):
    if not str(code or '').strip():
        return
    path = image_path if image_path is not None else render_mermaid_to_png(code, key)
    if not path or not os.path.isfile(path):
        raise RuntimeError(f'Diagram rendering did not produce an image: {title}')
    with Image.open(path) as image:
        width, height = image.size
    min_pt = 14 if ('detail' in key or 'technical' in key or 'evolution' in key) else 18
    validate_diagram_geometry(width, height, title, min_pt=min_pt)
    _image_slide(prs, title, path, target, 'Diagram generated from the repository analysis')


def _excerpt(text, words=18):
    text=sanitize_text(text).replace('```', '').strip()
    sentence=re.split(r'(?<=[.!?])\s+',text)[0]
    tokens=sentence.split()
    return ' '.join(tokens[:words]) + (' ...' if len(tokens)>words else '')


def _shape(slide,x,y,w,h,fill):
    shape=slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,Inches(x),Inches(y),Inches(w),Inches(h))
    shape.fill.solid();shape.fill.fore_color.rgb=RGBColor.from_string(fill)
    shape.line.fill.background()
    return shape


def _cards(prs,title,items,target,section='Project review'):
    palette=[('EEF4FF','0052CC'),('EAF7F2','006644'),('FFF5E6','995500'),('F3EEFF','6554C0')]
    for offset in range(0,len(items),4):
        slide=_slide(prs,title if offset==0 else title+' (continued)',target,section)
        notes=[]
        for i,(label,body) in enumerate(items[offset:offset+4]):
            x=MARGIN+(i%2)*6.05;y=1.95+(i//2)*2.25
            fill,accent=palette[i]
            _shape(slide,x,y,5.78,2.08,fill)
            lines=_wrap(label,18,5.3)
            _textbox(slide,'\n'.join(lines[:2]),x+.24,y+.18,5.3,.65,'compact','navy',True)
            excerpt = _excerpt(body)
            visible = _wrap(excerpt, 18, 5.3)
            # All original content stays in notes. The canvas is a deliberate excerpt.
            if len(visible) > 3:
                excerpt = _excerpt(body, 12)
                visible = _wrap(excerpt, 18, 5.3)
            if len(visible) > 3:
                excerpt = _excerpt(body, 8)
                visible = _wrap(excerpt, 18, 5.3)
            if len(visible) > 3:
                visible = visible[:3]
                if visible and not visible[-1].endswith('...'):
                    visible[-1] = visible[-1].rstrip('.') + '...'
            _textbox(slide, '\n'.join(visible), x + .24, y + .96, 5.3, .95, 'compact')
            notes.append(label + '\n' + str(body))
        _notes(slide,'\n\n'.join(notes))
    return slide if items else None


def generate_pptx_deck(result: AgentExtractionResult, owner: str = '', repo: str = '', diagram_images=None) -> bytes:
    validate_sequence_diagram(result.developer_handover_guide.execution_sequence_chart)
    prs=Presentation();prs.slide_width=Inches(SLIDE_W);prs.slide_height=Inches(SLIDE_H)
    prs.core_properties.title=result.project_name;prs.core_properties.author='PRISM'
    target=f'{owner}/{repo}' if owner and repo else result.project_name
    guide=result.developer_handover_guide;deck=result.presentation_deck
    def diagram(title,code,key,explanation):
        if not str(code or '').strip():return
        path=diagram_images[code] if diagram_images is not None else None
        _diagram_slide(prs,title,code,key,target,image_path=path)
        _notes(prs.slides[-1],explanation+'\nSources:\n'+'\n'.join(result.inspected_files))
    cover=_slide(prs,'',target,'PROJECT REVIEW')
    title=repo or result.project_name
    _textbox(cover,'\n'.join(_wrap(title,44)),MARGIN,1.45,CONTENT_W,1.6,'cover','navy',True)
    _textbox(cover,'Architecture, engineering and evaluation',MARGIN,3.2,CONTENT_W,.5,'section','body')
    for i,label in enumerate(('Architecture','Technology','Evidence')):
        _shape(cover,MARGIN+i*4.05,4.6,3.7,.85,('EEF4FF','EAF7F2','F3EEFF')[i])
        _textbox(cover,label,MARGIN+i*4.05+.2,4.84,3.3,.4,'compact','navy',True)
    _notes(cover,result.project_name+'\n'+deck.executive_pitch)
    _cards(prs,'Problem and project approach',[
        ('Problem statement',result.problem_statement),('Core approach',deck.executive_pitch),
        ('Practical value',deck.business_value),('Engineering challenge',deck.technical_challenges)],target)
    metrics=result.source_metrics or {}
    slide=_slide(prs,'Code size and inspection coverage',target,'MEASURED SCOPE')
    values=[('Inspected source KLOC',f"{metrics['kloc']:.3f}" if 'kloc' in metrics else 'Not measured'),
            ('Files inspected',str(len(result.inspected_files))),('Knowledge findings',str(len(result.knowledge_items)))]
    for i,(label,value) in enumerate(values):
        x=MARGIN+i*4.05
        _shape(slide,x,2.25,3.7,2.55,('EEF4FF','EAF7F2','FFF5E6')[i])
        _textbox(slide,label,x+.2,2.55,3.3,.6,'compact','navy',True)
        _textbox(slide,value,x+.2,3.45,3.3,.7,'title','blue',True)
    _textbox(slide,'Scope: inspected source only. Whole-repository KLOC and test coverage are not established.',
             MARGIN,5.4,CONTENT_W,.5,'caption')
    _notes(slide,json.dumps(metrics,indent=2)+'\n'+'\n'.join(result.inspected_files))
    for start in range(0,len(result.tech_stack),24):
        slide=_slide(prs,'Technology stack',target,'VERIFIED DEPENDENCIES')
        for i,tech in enumerate(result.tech_stack[start:start+24]):
            x=MARGIN+(i%4)*3.03;y=1.95+(i//4)*.78
            _shape(slide,x,y,2.75,.66,('EEF4FF','EAF7F2','F3EEFF','FFF5E6')[i%4])
            lines = _wrap(tech, 18, 2.4)
            if len(lines) > 2:
                lines = lines[:2]
                if lines and not lines[-1].endswith('...'):
                    lines[-1] = lines[-1].rstrip('.') + '...'
            _textbox(slide, '\n'.join(lines), x + .15, y + .05, 2.4, .6, 'compact', 'navy', True)
        _notes(slide,'\n'.join(result.tech_stack))
    diagram('System architecture',result.architecture_mermaid_chart,f'{owner}_{repo}_arch',result.architecture_explanation)
    diagram('Primary execution sequence',guide.execution_sequence_chart,f'{owner}_{repo}_seq',result.sequence_explanation)
    for i,view in enumerate(result.technical_diagrams):
        diagram(view.title,view.mermaid,f'{owner}_{repo}_detail_{i}',view.explanation)
    _cards(prs,'Core capabilities',[(k.title,k.summary) for k in result.knowledge_items],target,'SOURCE-BACKED FINDINGS')
    audit=result.verification_report
    _cards(prs,'Evaluation and evidence limits',[
        ('Repository audit',audit.verdict.replace('_',' ') if audit else 'No independent audit attached'),
        ('Tests and benchmarks','Not executed by this extraction. '+str(guide.testing_instructions)),
        ('Security boundary',result.analytics_metrics.security_posture),
        ('Evidence scope',f'{len(result.inspected_files)} recorded file reads. Path checks and an AI audit do not prove runtime correctness.')],target)
    risks=[]
    for i,text in enumerate(guide.technical_debt_and_fragility):
        body=re.sub(r'^\[[^]]+\]\s*','',text)
        if ': ' in body:body=body.split(': ',1)[1]
        risks.append((f'Engineering risk {i+1:02}',body))
    _cards(prs,'Risks and next steps',risks+[('Proposed improvements',deck.future_scope)],target)
    for start in range(0,len(result.jira_context),4):
        subset=result.jira_context[start:start+4]
        slide=_slide(prs,'Jira requirements and board status',target,'REQUIREMENTS TRACEABILITY')
        for i,issue in enumerate(subset):
            y=2.0+i*1.0
            _shape(slide,MARGIN,y,CONTENT_W,.88,'EEF4FF')
            _textbox(slide,str(issue.get('issue_key','Jira')),MARGIN+.2,y+.18,1.55,.5,'compact','blue',True)
            title_lines = _wrap(_excerpt(issue.get('summary', ''), 14), 18, 6.6)
            title = '\n'.join(title_lines[:2])
            _textbox(slide, title, MARGIN + 1.85, y + .14, 6.6, .6, 'compact')
            status_lines = _wrap(str(issue.get('status') or 'Not supplied'), 18, 2.6)
            status = '\n'.join(status_lines[:2])
            _textbox(slide, status, MARGIN + 8.8, y + .14, 2.6, .6, 'compact', 'navy', True)
        _textbox(slide,'Board status describes requirements; implementation and test success need separate evidence.',
                 MARGIN,6.25,CONTENT_W,.5,'caption')
        _notes(slide,json.dumps(subset,indent=2))
    # Complete handover, detailed findings and source references are editable notes,
    # while the PDF remains the detailed engineering document.
    _notes(prs.slides[-1],prs.slides[-1].notes_slide.notes_text_frame.text+'\nFULL SOURCE REVIEW\n'+result.model_dump_json(indent=2))
    for i,slide in enumerate(prs.slides,1):
        _textbox(slide,f'{i} / {len(prs.slides)}',SLIDE_W-MARGIN-.8,6.97,.8,.25,'footer','muted')
    output=BytesIO();prs.save(output)
    data=output.getvalue()
    validate_pptx_publication(data)
    return data

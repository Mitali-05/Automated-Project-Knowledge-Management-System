"""White-background, evidence-labelled engineering report with dedicated diagrams."""
import logging
import re
from io import BytesIO
from pathlib import Path, PurePosixPath
from xml.sax.saxutils import escape
from urllib.parse import quote

from PIL import Image as PILImage
from matplotlib import font_manager
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                               Spacer, LongTable, TableStyle, Image, KeepTogether)
from app.core.models import AgentExtractionResult
from app.mcp.inspection_contract import validate_sequence_diagram
from app.utils.diagram_renderer import render_mermaid_to_png, clean_mermaid_code, DIAGRAM_TEXT_PX
from app.utils.publication_contract import validate_pdf_publication

logger = logging.getLogger(__name__)

FONT_REG, FONT_BOLD = 'PrismArial', 'PrismArial-Bold'
INK, BODY, MUTED = '#172B4D', '#263445', '#475569'
BLUE, PALE, BORDER = '#0052CC', '#E9EFF6', '#CBD5E1'
MARGIN = 48
PAGE_W, PAGE_H = A4
TEXT_W = PAGE_W - MARGIN * 2


def _register_fonts():
    import glob
    for font_file in glob.glob('/usr/local/share/fonts/**/*.ttf', recursive=True) + \
                     glob.glob('/usr/local/share/fonts/**/*.TTF', recursive=True):
        try:
            font_manager.fontManager.addfont(font_file)
        except Exception:
            pass
    for name, weight in [(FONT_REG, 'normal'), (FONT_BOLD, 'bold')]:
        if name not in pdfmetrics.getRegisteredFontNames():
            path = font_manager.findfont(font_manager.FontProperties(family='Arial', weight=weight),
                                         fallback_to_default=False)
            pdfmetrics.registerFont(TTFont(name, path))
    pdfmetrics.registerFontFamily(FONT_REG, normal=FONT_REG, bold=FONT_BOLD)


def sanitize_text(text):
    text = str(text or '')
    text = re.sub(r'((?:MONGODB_URI|SMTP_PASS|JWT_SECRET(?:_KEY)?|DB_PASSWORD|POSTGRES_PASSWORD)=)[^\s,]+',
                  r'\1[REDACTED]', text)
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)


def _html(text):
    return escape(sanitize_text(text)).replace('\n', '<br/>')


def _styles():
    return {
        'title': ParagraphStyle('Title', fontName=FONT_BOLD, fontSize=30, leading=36,
                                textColor=colors.HexColor(INK), spaceAfter=14),
        'h1': ParagraphStyle('Section', fontName=FONT_BOLD, fontSize=17, leading=23,
                             textColor=colors.HexColor(INK), spaceBefore=16, spaceAfter=9, keepWithNext=True),
        'h2': ParagraphStyle('Subsection', fontName=FONT_BOLD, fontSize=12, leading=17,
                             textColor=colors.HexColor(INK), spaceBefore=12, spaceAfter=6, keepWithNext=True),
        'body': ParagraphStyle('Body', fontName=FONT_REG, fontSize=11, leading=16,
                               textColor=colors.HexColor(BODY), spaceAfter=9, splitLongWords=True),
        'caption': ParagraphStyle('Caption', fontName=FONT_REG, fontSize=9.5, leading=13,
                                  textColor=colors.HexColor(MUTED), spaceAfter=8),
        'cell': ParagraphStyle('Cell', fontName=FONT_REG, fontSize=10, leading=14,
                               textColor=colors.HexColor(BODY), splitLongWords=True),
        'headcell': ParagraphStyle('HeadCell', fontName=FONT_BOLD, fontSize=10, leading=14,
                                   textColor=colors.HexColor(INK)),
    }


def _decorate(c, doc):
    w, h = c._pagesize
    c.saveState()
    c.setFillColor(colors.white)
    c.rect(0, 0, w, h, stroke=0, fill=1)
    c.setFillColor(colors.HexColor(BLUE))
    c.rect(MARGIN, h - 40, 32, 3, stroke=0, fill=1)
    c.setFillColor(colors.HexColor(MUTED))
    c.setFont(FONT_REG, 9)
    c.drawString(MARGIN, h - 29, 'PRISM / Architecture and engineering review')
    c.drawString(MARGIN, 27, 'PRISM / Source-based engineering review')
    c.drawRightString(w - MARGIN, 27, f'Page {doc.page}')
    c.setStrokeColor(colors.HexColor(BORDER))
    c.line(MARGIN, 42, w - MARGIN, 42)
    c.restoreState()


def _table(rows, widths, styles):
    data = [[Paragraph(_html(v), styles['headcell' if i == 0 else 'cell'])
             for v in row] for i, row in enumerate(rows)]
    table = LongTable(data, colWidths=widths, repeatRows=1, hAlign='LEFT', splitInRow=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(PALE)),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor(BODY)),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), .4, colors.HexColor(BORDER)),
        ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    return table


def _diagram_image(path, max_width, max_height):
    if not path or not Path(path).is_file():
        raise RuntimeError('Required diagram image is missing; no substitute renderer is used')
    with PILImage.open(path) as im:
        width, height = im.size
    # Proportional scaling (zoom out) to fit within the available A4 portrait content area.
    # Every page stays strictly portrait; the diagram scales down to fit page bounds cleanly.
    scale = min(max_width / width, max_height / height)
    if DIAGRAM_TEXT_PX * scale < 7.5:
        raise ValueError('Diagram is too dense for readable publication. Reduce participants/nodes/messages and regenerate it.')
    image = Image(path, width=width * scale, height=height * scale)
    image.hAlign = 'CENTER'
    return image


def generate_pdf_report(result: AgentExtractionResult, owner='', repo='', diagram_images=None) -> bytes:
    _register_fonts()
    # Export must never silently omit a missing or over-dense sequence diagram.
    # Citation-read checks are enforced by the extraction runner; legacy saved
    # reports may lack inspected_files, so export checks diagram syntax separately.
    validate_sequence_diagram(result.developer_handover_guide.execution_sequence_chart)
    output = BytesIO()
    doc = BaseDocTemplate(output, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                          topMargin=52, bottomMargin=52, title=result.project_name,
                          author='PRISM', allowSplitting=True)
    frame = Frame(MARGIN, 52, TEXT_W, PAGE_H - 104,
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates(PageTemplate(id='portrait', frames=[frame], pagesize=A4, onPage=_decorate))
    styles, story, section_number = _styles(), [], 0
    target = f'{owner}/{repo}' if owner and repo else result.project_name
    guide, deck, metrics = result.developer_handover_guide, result.presentation_deck, result.analytics_metrics

    def paragraph(text, role='body'):
        if str(text or '').strip():
            story.append(Paragraph(_html(text), styles[role]))

    def section_heading(text):
        nonlocal section_number
        section_number += 1
        label = f'{section_number}. ' + re.sub(r'^\d+\.\s*', '', text)
        return Paragraph(_html(label), styles['h1'])

    def heading(text):
        story.append(section_heading(text))

    def new_section(text):
        story.append(Spacer(1, 9))
        heading(text)

    def diagram(title, code, suffix, caption):
        if not str(code or '').strip():
            return
        cleaned = clean_mermaid_code(code)
        stripped = re.sub(r'^%%\{init:.*?\}%%\s*', '', cleaned, flags=re.DOTALL).strip()
        first_word = stripped.split()[0].lower() if stripped.split() else ''
        is_valid_type = any(first_word.startswith(t) for t in ('graph', 'flowchart', 'sequence', 'class', 'state', 'erdiagram', 'gantt', 'pie', 'timeline', 'gitgraph', 'mindmap', 'c4', 'sankey', 'xychart'))
        if not is_valid_type:
            heading(title)
            paragraph(str(code))
            paragraph(caption, 'caption')
            return
        try:
            path = diagram_images[code] if diagram_images is not None else render_mermaid_to_png(code, f'{owner}_{repo}_{suffix}')
        except Exception as exc:
            if suffix in ('dependencies', 'timeline') or 'detail_' in suffix:
                logger.warning('Optional diagram %s rendering failed, formatting as text note: %s', title, exc)
                heading(title)
                paragraph(str(code))
                paragraph(caption, 'caption')
                return
            raise
        image = _diagram_image(path, TEXT_W, 520)
        figure = [section_heading(title), image]
        if str(caption or '').strip():
            figure.extend([Spacer(1, 12), Paragraph(_html(caption), styles['caption'])])
        story.append(KeepTogether(figure))

    paragraph('REPOSITORY ARCHITECTURE REVIEW', 'caption')
    paragraph(result.project_name, 'title')
    paragraph(target)
    paragraph('Scope: source inspection and AI-assisted synthesis. No production certification, '
              'independent performance benchmark or runtime test result is implied.', 'caption')
    heading('1. Purpose and system scope')
    paragraph(result.problem_statement)
    paragraph('Executive summary', 'h2')
    paragraph(deck.executive_pitch)
    paragraph('Inspection coverage', 'h2')
    if result.inspected_files:
        paragraph(f'{len(result.inspected_files)} files recorded as inspected. Exact paths are listed in the source appendix.')
    else:
        paragraph('The saved report has no machine-recorded inspection inventory. Source coverage is unverified.')
    if result.source_metrics:
        measured = result.source_metrics
        paragraph('Measured inspected-source size', 'h2')
        paragraph(f"Inspected source KLOC: {measured.get('kloc', 'Not measured')}. "
                  'This measures only captured source bodies, not whole-repository size or test coverage.')

    new_section('2. Business value and engineering context')
    paragraph('Business value', 'h2'); paragraph(deck.business_value)
    if deck.roi_summary and deck.roi_summary.strip().lower().rstrip('.') != 'not measured':
        paragraph('Reported impact / Not independently measured', 'h2'); paragraph(deck.roi_summary)
    paragraph('Engineering challenges and trade-offs', 'h2'); paragraph(deck.technical_challenges)
    paragraph('Proposed future scope', 'h2'); paragraph(deck.future_scope)

    diagram('3. System architecture', result.architecture_mermaid_chart, 'arch',
            result.architecture_explanation or result.problem_statement)
    heading('4. Primary workflow and evidence boundaries')
    for workflow in guide.critical_workflows:
        paragraph(workflow.workflow_name, 'h2')
        paragraph('Entry point: ' + workflow.entry_point)
        paragraph(workflow.execution_path)
    if not guide.critical_workflows:
        paragraph('No workflow evidence notes were supplied. Do not infer response codes or delivery guarantees from the diagram.')
    diagram('5. Primary interaction sequence', guide.execution_sequence_chart, 'seq',
            result.sequence_explanation or '\n'.join(w.execution_path for w in guide.critical_workflows))
    for i, view in enumerate(result.technical_diagrams):
        diagram(view.title, view.mermaid, f'detail_{i}', view.explanation + '\nSources: ' + ', '.join(view.evidence_ids))
    heading('6. Technology and analysis coverage')
    paragraph('Technology stack', 'h2'); paragraph(', '.join(result.tech_stack))
    story.append(_table([
        ['Dimension', 'Reported finding'],
        ['Complexity', metrics.estimated_complexity], ['Core module count', str(metrics.core_module_count)],
        ['Data flow complexity', metrics.data_flow_complexity], ['Security boundary', metrics.security_posture],
        ['Observed patterns', '\n'.join(metrics.key_patterns_used) or 'Not reported'],
    ], [150, TEXT_W - 150], styles))
    paragraph('Counts and complexity labels are analysis outputs, not measured code coverage or production-readiness scores.', 'caption')
    new_section('7. Engineering handover')
    paragraph('Local setup', 'h2'); paragraph(guide.local_setup_prerequisites)
    if guide.directory_tour:
        paragraph('Directory responsibilities', 'h2')
        story.append(_table([['Exact path', 'Responsibility']] +
                            [[x.folder_path, x.architectural_role] for x in guide.directory_tour],
                            [210, TEXT_W - 210], styles))
    paragraph('Testing instructions / Execution not implied', 'h2'); paragraph(guide.testing_instructions)
    paragraph('Build and deployment', 'h2'); paragraph(guide.cicd_instructions)
    new_section('8. Risks and proposed remediation')
    if guide.technical_debt_and_fragility:
        for index, risk in enumerate(guide.technical_debt_and_fragility, 1):
            paragraph(f'Finding {index:02}', 'h2')
            paragraph(risk)
    else:
        paragraph('No risk findings were supplied. This is not evidence that the system has no defects.')
    new_section('9. Knowledge findings and supporting files')
    for item in result.knowledge_items:
        paragraph(item.title, 'h2')
        paragraph(item.summary); paragraph(item.details)
        paragraph(f'Type: {item.knowledge_type}; module: {item.module or "Not reported"}; '
                  f'reported impact: {item.business_impact}. AI confidence: {item.confidence:.0%}, '
                  'not calibrated accuracy.', 'caption')
        paragraph('Evidence: ' + ', '.join(item.evidence_ids), 'caption')
    if not result.knowledge_items:
        paragraph('No supported knowledge findings were supplied.')
    if guide.directory_dependency_chart:
        diagram('10. Module dependencies', guide.directory_dependency_chart, 'dependencies',
                'Dependencies must refer to inspected modules. This is a dependency view, not a deployment topology.')
    heading('11. Verification and limitations')
    if result.verification_report:
        audit = result.verification_report
        paragraph('AI-reported verdict: ' + audit.verdict)
        paragraph('The second agent has report text and file-path checks, not an independent full-source audit or runtime execution. '
                  'A matching file path does not prove a behavioural claim.')
        for finding in audit.audit_findings:
            paragraph(finding)
        paragraph(audit.verification_agent_notes)
    else:
        paragraph('No verification-agent result is attached. Do not treat this report as independently verified.')
    if result.milestone_timeline_mermaid_chart:
        diagram('12. Source-supported evolution', result.milestone_timeline_mermaid_chart, 'timeline',
                'Historical milestones require inspected commit identifiers and dates; proposed plans belong in future scope.')
    if result.jira_context:
        heading('Jira requirements and discussions')
        paragraph('Project-wide Jira snapshot. These sources describe requirements and discussions, not proof of implemented or tested behaviour.')
        for issue in result.jira_context:
            paragraph(str(issue.get('issue_key', '')) + ': ' + str(issue.get('summary', '')), 'h2')
            for label, key in [('Status','status'), ('Updated','source_updated_at'), ('Description','description'), ('Acceptance criteria','acceptance_criteria'), ('Comments','comments'), ('Source','source_url')]:
                if issue.get(key): paragraph(label + ': ' + str(issue[key]))
    heading('13. Source references')
    paths = sorted(set(result.inspected_files) | {p for k in [*result.knowledge_items, *result.technical_diagrams] for p in k.evidence_ids})
    for i, path in enumerate(paths, 1):
        label = _html(f'[{i}] {path}')
        safe = not PurePosixPath(path).is_absolute() and '..' not in PurePosixPath(path).parts
        if owner and repo and safe:
            url = f'https://github.com/{quote(owner, safe="")}/{quote(repo, safe="")}/blob/HEAD/{quote(path, safe="/")}'
            story.append(Paragraph(f'<a href="{escape(url)}" color="{BLUE}">{label}</a>', styles['caption']))
        else:
            paragraph(f'[{i}] {path}', 'caption')
    paragraph('Links target the repository HEAD because this extraction did not record a commit identifier. '
              'Future changes can move those lines; a reproducible audit must pin the commit.', 'caption')
    doc.build(story)
    data = output.getvalue()
    validate_pdf_publication(data)
    return data

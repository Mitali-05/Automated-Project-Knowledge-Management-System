"""Render model diagrams before publication; never downgrade readability checks."""
import hashlib
from PIL import Image
from app.mcp.inspection_contract import DiagramContractError
from app.utils.diagram_renderer import render_mermaid_to_png
from app.utils.pptx_exporter import validate_diagram_geometry


def validate_rendered_report(result, cache):
    views = [(('architecture_mermaid_chart',), 'System architecture', result.architecture_mermaid_chart, 18),
             (('developer_handover_guide', 'execution_sequence_chart'), 'Primary sequence', result.developer_handover_guide.execution_sequence_chart, 18)]
    views += [(('technical_diagrams', i, 'mermaid'), v.title, v.mermaid, 18) for i,v in enumerate(result.technical_diagrams)]
    if result.milestone_timeline_mermaid_chart:
        views.append((('milestone_timeline_mermaid_chart',), 'Evolution', result.milestone_timeline_mermaid_chart, 18))
    failures=[]
    for path,title,code,min_pt in views:
        if not str(code or '').strip():
            if path == ('architecture_mermaid_chart',): failures.append((path,'System architecture is missing'))
            continue
        try:
            if code not in cache:
                cache[code]=render_mermaid_to_png(code,'preflight_'+hashlib.sha256(code.encode()).hexdigest()[:20])
            with Image.open(cache[code]) as image:
                validate_diagram_geometry(*image.size,title,min_pt=min_pt)
        except ValueError as exc:
            failures.append((path,str(exc)))
        except RuntimeError as exc:
            if 'parse error' in str(exc).lower() or 'syntax error' in str(exc).lower():
                failures.append((path,str(exc)))
            else:
                raise
    if failures:
        error=DiagramContractError('\n'.join(f'{list(path)}: {message}' for path,message in failures))
        error.path=failures[0][0]
        error.visual_bundle=True
        raise error

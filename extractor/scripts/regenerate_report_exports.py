"""Regenerate PDF/PPTX from an existing report JSON, without model or DB calls."""
import argparse
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.models import AgentExtractionResult
from app.utils.exporter import generate_pdf_report
from app.utils.pptx_exporter import generate_pptx_deck
from app.utils.pptx_exporter import validate_diagram_geometry
from app.utils.diagram_renderer import render_mermaid_to_png
from PIL import Image


def prepare_diagrams(report, owner, repo):
    """Render once, then report every slide geometry failure before serializing."""
    guide = report.developer_handover_guide
    views = [('System architecture', report.architecture_mermaid_chart, True),
             ('Primary sequence', guide.execution_sequence_chart, True)]
    views += [(v.title, v.mermaid, True) for v in report.technical_diagrams]
    views += [('Evolution', report.milestone_timeline_mermaid_chart, True),
              ('Module dependencies', guide.directory_dependency_chart, False)]
    images, errors = {}, []
    for i, (title, code, on_slide) in enumerate(views):
        if not str(code or '').strip():
            continue
        path = render_mermaid_to_png(code, f'{owner}_{repo}_review_{i}')
        images[code] = path
        with Image.open(path) as image:
            if on_slide:
                try:
                    font = validate_diagram_geometry(*image.size, title)
                    print(f'{title}: {image.width} x {image.height}px, nominal text {font:.1f}pt')
                except ValueError as exc:
                    errors.append(str(exc))
    if errors:
        raise ValueError('\n'.join(errors))
    return images


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('report_json', type=Path)
    parser.add_argument('--owner', required=True)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    report = AgentExtractionResult.model_validate_json(args.report_json.read_text(encoding='utf-8'))
    args.output.mkdir(parents=True, exist_ok=True)
    pdf_path = args.output / 'architecture-review.pdf'
    pptx_path = args.output / 'engineering-review.pptx'
    if pdf_path.exists() or pptx_path.exists():
        raise RuntimeError('Output already exists. Choose a new output directory to preserve previous exports.')
    images = prepare_diagrams(report, args.owner, args.repo)
    pdf = generate_pdf_report(report, args.owner, args.repo, diagram_images=images)
    deck = generate_pptx_deck(report, args.owner, args.repo, diagram_images=images)
    # Both renders must succeed before writing either deliverable.
    pdf_path.write_bytes(pdf)
    pptx_path.write_bytes(deck)
    print(pdf_path.resolve())
    print(pptx_path.resolve())
    print('Exports regenerated from saved JSON. No model calls or database writes.')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'Export regeneration failed: {exc}', file=sys.stderr)
        raise SystemExit(1)

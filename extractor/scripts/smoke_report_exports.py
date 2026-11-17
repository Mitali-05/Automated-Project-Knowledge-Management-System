"""Exercise real Mermaid/PDF/PPTX exports without GitHub, LLM or database writes."""
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'tests'))

from report_fixture import report_fixture
from app.utils.exporter import generate_pdf_report
from app.utils.pptx_exporter import generate_pptx_deck


def main():
    folder = Path(tempfile.mkdtemp(prefix='prism-export-smoke-'))
    result = report_fixture()
    pdf = generate_pdf_report(result, 'qa', 'export-fixture')
    deck = generate_pptx_deck(result, 'qa', 'export-fixture')
    (folder / 'export-fixture-report.pdf').write_bytes(pdf)
    (folder / 'export-fixture-deck.pptx').write_bytes(deck)
    print('Real Mermaid rendering and PDF/PPTX serialization completed.')
    print('Synthetic fixture only; no repository, model, or database was accessed.')
    print(folder)


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'Export smoke test failed: {exc}', file=sys.stderr)
        raise SystemExit(1)

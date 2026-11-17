import unittest
from unittest.mock import patch
from io import BytesIO
from PIL import Image
from pptx import Presentation
from report_fixture import report_fixture
from app.mcp.inspection_contract import prioritized_tree_paths, validate_report_contract
from app.core.models import TechnicalDiagram
from app.utils.pptx_exporter import generate_pptx_deck
from prism_bridge import to_ingest_items


class ReportCoverageTests(unittest.TestCase):
    def test_runtime_and_manifests_precede_generated_files(self):
        tree = [{'path': f'node_modules/vendor/{i}.js'} for i in range(250)]
        tree.extend({'path': p} for p in ['backend/app/main.py', 'backend/requirements.txt', 'README.md'])
        paths = prioritized_tree_paths(tree)
        self.assertIn('backend/app/main.py', paths[:3])
        self.assertIn('backend/requirements.txt', paths[:3])

    def test_multiple_repositories_keep_distinct_evidence_without_jira(self):
        report = report_fixture()
        first = to_ingest_items(report, 'team', 'api')[0]
        second = to_ingest_items(report, 'team', 'web')[0]
        self.assertNotEqual(first['externalId'], second['externalId'])
        self.assertIn('/team/api/', first['evidence'][0]['url'])
        self.assertIn('/team/web/', second['evidence'][0]['url'])

    def test_extra_diagram_cannot_cite_unread_source(self):
        report = report_fixture()
        report.technical_diagrams = [TechnicalDiagram(title='Query flow', kind='flowchart',
            mermaid='flowchart LR\n A --> B', explanation='Observed query', evidence_ids=['unread.py'])]
        with self.assertRaisesRegex(ValueError, 'not inspected'):
            validate_report_contract(report, {'app/main.py'})

    def test_small_deck_groups_content_and_has_no_decorative_score_charts(self):
        fixture = report_fixture()
        image = BytesIO()
        Image.new('RGB', (1000, 450), 'white').save(image, format='PNG')
        with patch('app.utils.pptx_exporter.render_mermaid_to_png', return_value='test.png'), patch(
                'app.utils.pptx_exporter.os.path.isfile', return_value=True), patch(
                'app.utils.pptx_exporter.Image.open', side_effect=lambda _: Image.new('RGB', (1000, 450), 'white')), patch(
                'pptx.shapes.shapetree.SlideShapes.add_picture'):
            deck = Presentation(BytesIO(generate_pptx_deck(fixture, 'qa', 'fixture')))
        text = '\n'.join(s.text for slide in deck.slides for s in slide.shapes if s.has_text_frame)
        self.assertNotIn('AI verification scores', text)
        self.assertNotIn('Cited subsystem references', text)
        self.assertNotIn('Reported business impact', text)
        self.assertLess(len(deck.slides), 20)
        self.assertIn('Problem statement', text)
        self.assertIn('Inspected source KLOC', text)
        self.assertIn('Evaluation and evidence limits', text)
        from pptx.enum.shapes import MSO_SHAPE_TYPE
        cards=[s for slide in deck.slides for s in slide.shapes if s.shape_type==MSO_SHAPE_TYPE.AUTO_SHAPE]
        self.assertGreaterEqual(len(cards),12)
        self.assertTrue(all(len('\n'.join(s.text for s in slide.shapes if s.has_text_frame).split())<125 for slide in deck.slides))
        notes='\n'.join(slide.notes_slide.notes_text_frame.text for slide in deck.slides)
        self.assertIn(fixture.developer_handover_guide.local_setup_prerequisites,notes)


if __name__ == '__main__':
    unittest.main()

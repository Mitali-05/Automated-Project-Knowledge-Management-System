import asyncio
import json
import sys
import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from PIL import Image
from pptx import Presentation

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from report_fixture import report_fixture
from app.mcp.inspection_contract import inspection_deficits, validate_report_contract, validate_sequence_diagram
from app.utils import diagram_renderer, exporter, pptx_exporter


class ReportFormattingTests(unittest.TestCase):
    def test_adjacent_diagrams_do_not_insert_empty_portrait_pages(self):
        from app.core.models import TechnicalDiagram
        pages, text_pages = set(), set()
        original_decorate = exporter._decorate
        def decorate(canvas, doc):
            pages.add(doc.page)
            self.assertLess(canvas._pagesize[0],canvas._pagesize[1],
                            'Every PDF page, including diagram pages, must remain portrait')
            original_decorate(canvas, doc)
        def after_flowable(doc, flowable):
            if isinstance(flowable, exporter.Paragraph) and flowable.getPlainText().strip():
                text_pages.add(doc.page)
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'diagram.png'
            Image.new('RGB', (1000, 450), 'white').save(path)
            result = report_fixture()
            result.technical_diagrams = [TechnicalDiagram(title=f'Detail {i}', kind='flowchart',
                mermaid=f'flowchart LR\n A --> B{i}', explanation='Source-supported detail.',
                evidence_ids=['app/main.py']) for i in range(2)]
            with patch.object(exporter, 'render_mermaid_to_png', return_value=str(path)), patch.object(
                    exporter, '_decorate', side_effect=decorate), patch.object(
                    exporter.BaseDocTemplate, 'afterFlowable', new=after_flowable):
                exporter.generate_pdf_report(result, 'qa', 'fixture')
        self.assertEqual(pages, text_pages, 'Every page must contain actual report text, beyond headers and footers')

    def test_docs_and_compose_are_not_runtime_source_coverage(self):
        tree = [{'path': x} for x in ['README.md', 'docker-compose.yml', 'app/main.py',
                                     'app/worker.py', 'app/models.py', 'requirements.txt']]
        self.assertTrue(inspection_deficits(tree, {'README.md', 'docker-compose.yml'}))
        self.assertFalse(inspection_deficits(tree, {'app/main.py', 'app/worker.py', 'app/models.py', 'requirements.txt'}))

    def test_unread_evidence_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'not inspected'):
            validate_report_contract(report_fixture(), {'README.md'})

    def test_sequence_is_required_and_must_be_readable(self):
        for bad in ['', 'flowchart LR; A-->B', 'sequenceDiagram\n A->>B: call']:
            with self.assertRaises(ValueError):
                validate_sequence_diagram(bad)
        sequence = report_fixture().developer_handover_guide.execution_sequence_chart
        with self.assertRaisesRegex(ValueError, 'four-participant'):
            validate_sequence_diagram(sequence + '\n participant E as Extra')
        with self.assertRaisesRegex(ValueError, 'four-participant'):
            validate_sequence_diagram(sequence + '\n A->>Undeclared: Another call')

    def test_file_path_matches_do_not_become_verified_claim_counts(self):
        from app.core.verification_agent import VerificationAgent
        reply = {'overall_trust_score': 10, 'verdict': 'VERIFIED_WITH_WARNINGS',
                 'evidence_precision_score': 100, 'subsystem_recall_coverage': 10,
                 'hallucination_rate': 0, 'ml_audit': {'ml_models_detected': False, 'notes': 'Fixture only'},
                 'verified_claims_count': 0, 'unsupported_claims_count': 0}
        client = Mock()
        client.extract_json.return_value = reply
        result = VerificationAgent(client).audit_extraction(report_fixture(), [{'path': 'app/main.py'}])
        self.assertEqual(result.verified_claims_count, 0)
        payload = client.extract_json.call_args.kwargs['user_content']
        self.assertIn('Keep complete text and source paths.', payload)
        self.assertIn('no independent source-body audit', payload)
        client.extract_json.return_value = dict(reply, verdict='VERIFIED_PRODUCTION_GRADE')
        from app.core.llm_client import LLMError
        with self.assertRaisesRegex(LLMError, 'Verification audit failed'):
            VerificationAgent(client).audit_extraction(report_fixture())

    def test_renderer_applies_light_theme_without_changing_messages(self):
        code = '%%{init: {"theme":"dark"}}%%\nsequenceDiagram\n autonumber\n A->>B: Observed call'
        prepared = diagram_renderer.prepare_report_diagram(code)
        self.assertNotIn('theme', prepared)
        self.assertIn('A->>B: Observed call', prepared)
        self.assertEqual(diagram_renderer.REPORT_THEME['themeVariables']['actorBkg'], '#F4F8FD')
        self.assertEqual(diagram_renderer.REPORT_THEME['themeVariables']['fontFamily'], 'Arial')
        self.assertFalse(diagram_renderer.REPORT_THEME['flowchart']['useMaxWidth'])
        self.assertFalse(diagram_renderer.REPORT_THEME['sequence']['useMaxWidth'])

    def test_invalid_theme_configuration_is_not_silently_discarded(self):
        with self.assertRaises(ValueError):
            diagram_renderer.prepare_report_diagram('%%{init: broken}%%\nflowchart LR\n A-->B')

    def test_export_handles_markup_and_long_text_and_includes_sequence(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'diagram.png'
            Image.new('RGB', (1000, 450), 'white').save(path)
            result = report_fixture()
            result.knowledge_items[0].details = ('Text <literal> & source evidence. ' * 500) + 'FINAL_EVIDENCE_SENTENCE'
            with patch.object(exporter, 'render_mermaid_to_png', return_value=str(path)) as renderer:
                pdf = exporter.generate_pdf_report(result, 'qa', 'fixture')
            self.assertTrue(pdf.startswith(b'%PDF-'))
            self.assertEqual([c.args[1] for c in renderer.call_args_list], ['qa_fixture_arch', 'qa_fixture_seq'])
            with patch.object(pptx_exporter, 'render_mermaid_to_png', return_value=str(path)):
                pptx = pptx_exporter.generate_pptx_deck(report_fixture(), 'qa', 'fixture')
            prs = Presentation(BytesIO(pptx))
            texts = '\n'.join(s.text for slide in prs.slides for s in slide.shapes if s.has_text_frame)
            self.assertIn('Primary execution sequence', texts)
            self.assertNotIn('Tier-1 Production Standard', texts)
            for slide in prs.slides:
                self.assertEqual(str(slide.background.fill.fore_color.rgb), 'FFFFFF')

    def test_dense_diagram_is_rejected_instead_of_shrunk(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'dense.png'
            Image.new('RGB', (1000, 3200), 'white').save(path)
            with self.assertRaisesRegex(ValueError, 'too dense'):
                exporter._diagram_image(str(path), 746, 360)
            with patch.object(pptx_exporter, 'render_mermaid_to_png', return_value=str(path)):
                with self.assertRaisesRegex(ValueError, 'too dense'):
                    pptx_exporter._diagram_slide(Presentation(), 'Architecture', 'flowchart LR; A-->B', 'qa', 'qa/repo')

    def test_agent_does_not_cut_source_at_5000_characters(self):
        from app.mcp.agent import run_autonomous_extraction
        tc = lambda name, path: SimpleNamespace(id=path, function=SimpleNamespace(name=name, arguments=json.dumps({'path': path})))
        messages = [SimpleNamespace(content=None, tool_calls=[tc('get_file_contents', 'app/main.py'),
                                                             tc('get_file_contents', 'requirements.txt')]),
                    SimpleNamespace(content=report_fixture().model_dump_json(), tool_calls=None)]
        create = Mock(side_effect=[SimpleNamespace(choices=[SimpleNamespace(message=m)]) for m in messages])
        llm = SimpleNamespace(model='test-only', client=SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create))))
        async def call_tool(name, arguments):
            content = ('# context\n' * 700) + 'SOURCE_END_MARKER'
            text = json.dumps({'path': arguments['path'], 'content': content})
            return SimpleNamespace(isError=False, content=[SimpleNamespace(text=text)])
        session = SimpleNamespace(list_tools=AsyncMock(return_value=SimpleNamespace(tools=[
            SimpleNamespace(name='get_file_contents', description='Read source', input_schema={'type': 'object'})])),
            call_tool=call_tool)
        with patch('app.mcp.agent.asyncio.sleep', new_callable=AsyncMock):
            result, _ = asyncio.run(run_autonomous_extraction('qa', 'fixture', llm, session, validate_rendering=False,
                file_tree=[{'path': 'app/main.py'}, {'path': 'requirements.txt'}]))
        self.assertIn('app/main.py', result.inspected_files)
        tool_messages = [m for m in create.call_args.kwargs['messages'] if isinstance(m, dict) and m['role'] == 'tool']
        self.assertTrue(all('SOURCE_END_MARKER' in m['content'] for m in tool_messages))


if __name__ == '__main__':
    unittest.main()

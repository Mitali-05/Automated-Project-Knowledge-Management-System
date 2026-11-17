import unittest
from unittest.mock import Mock,patch
import prism_bridge as bridge
from report_fixture import report_fixture
from io import BytesIO
from PIL import Image
from pathlib import Path
from tempfile import TemporaryDirectory
from pptx import Presentation
from app.utils.exporter import generate_pdf_report
from app.utils.pptx_exporter import generate_pptx_deck

class JiraReportTests(unittest.TestCase):
    def test_empty_context_remains_github_only(self):
        self.assertEqual(report_fixture().jira_context,[])

    def test_refresh_uses_saved_analysis_and_publishes_both_files_together(self):
        api=Mock(base='http://localhost:8081')
        job=dict(id='job',base_version='version',report=report_fixture().model_dump_json(),
                 issues=[dict(issue_key='SCRUM-3',summary='Source requirement')],repo_owner='qa',repo_name='fixture')
        api._check.return_value.json.return_value=[job]
        with patch('app.utils.exporter.generate_pdf_report',return_value=b'pdf') as pdf, patch(
                'app.utils.pptx_exporter.generate_pptx_deck',return_value=b'deck'):
            bridge.refresh_jira_reports(api)
        body=api.http.post.call_args.kwargs['json']
        self.assertEqual(body['report']['jira_context'],job['issues'])
        self.assertIn('pdf',body);self.assertIn('pptx',body)
        self.assertEqual(pdf.call_args.args[0].jira_context,job['issues'])

    def test_export_error_reports_failure_without_publishing_partial_files(self):
        api=Mock(base='http://localhost:8081')
        api._check.return_value.json.return_value=[dict(id='job',base_version='v',report=report_fixture().model_dump_json(),issues=[],repo_owner='qa',repo_name='fixture')]
        with patch('app.utils.exporter.generate_pdf_report',side_effect=RuntimeError('Render failed')):
            bridge.refresh_jira_reports(api)
        body=api.http.post.call_args.kwargs['json']
        self.assertEqual(body['error'],'Render failed');self.assertNotIn('pdf',body)

    def test_jira_text_and_source_survive_both_exports(self):
        report=report_fixture()
        report.jira_context=[dict(issue_key='SCRUM-3',summary='JIRA_REQUIREMENT_MARKER',description='REQUIREMENT_BODY',
            comments='DISCUSSION_MARKER',source_url='https://qa.atlassian.net/browse/SCRUM-3',source_updated_at='2026-11-16')]
        with TemporaryDirectory() as folder:
            path=Path(folder)/'diagram.png';Image.new('RGB',(1000,450),'white').save(path)
            images={report.architecture_mermaid_chart:str(path),report.developer_handover_guide.execution_sequence_chart:str(path)}
            pdf=generate_pdf_report(report,'qa','fixture',diagram_images=images)
            deck=Presentation(BytesIO(generate_pptx_deck(report,'qa','fixture',diagram_images=images)))
        self.assertTrue(pdf.startswith(b'%PDF'))
        text='\n'.join(s.text for slide in deck.slides for s in slide.shapes if s.has_text_frame)
        notes='\n'.join(slide.notes_slide.notes_text_frame.text for slide in deck.slides)
        self.assertIn('SCRUM-3',text)
        self.assertIn('JIRA_REQUIREMENT_MARKER',text)
        for marker in ('REQUIREMENT_BODY','DISCUSSION_MARKER','https://qa.atlassian.net/browse/SCRUM-3'):
            self.assertIn(marker,notes)
            self.assertNotIn(marker,text)

if __name__=='__main__':unittest.main()

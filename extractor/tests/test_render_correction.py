import asyncio
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch
from PIL import Image
from report_fixture import report_fixture
from test_report_output import client_for
from app.mcp.report_output import validate_or_correct_report
import prism_bridge as bridge


class RenderCorrectionTests(unittest.TestCase):
    def run_report(self, bad, *replies):
        client,create=client_for(*replies)
        with tempfile.TemporaryDirectory() as directory:
            large=Path(directory)/'wide.png';small=Path(directory)/'compact.png'
            Image.new('RGB',(3502,568),'white').save(large)
            Image.new('RGB',(1200,500),'white').save(small)
            with patch('app.mcp.render_contract.render_mermaid_to_png',side_effect=lambda code,key:
                    str(large if 'Too wide' in code else small)) as render, patch(
                    'app.mcp.report_output.asyncio.sleep',new_callable=AsyncMock):
                result=asyncio.run(validate_or_correct_report(bad.model_dump_json(),client,
                    [{'role':'user','content':'Previously inspected source context'}],{'app/main.py'},validate_rendering=True))
                return result,create,render.call_count

    def bad_report(self):
        bad=report_fixture()
        bad.architecture_mermaid_chart='flowchart LR\n A["Too wide"] --> B["Observed dependency"]'
        return bad

    def test_wide_chart_is_corrected_without_new_source_reads(self):
        correct=report_fixture()
        result,create,calls=self.run_report(self.bad_report(),correct.model_dump_json())
        self.assertEqual(result.knowledge_items,correct.knowledge_items)
        self.assertEqual(create.call_count,1)
        self.assertEqual(calls,3,'Unchanged sequence image should be reused during correction')
        prompt=create.call_args.kwargs['messages'][-1]['content']
        self.assertIn('3502 x 568',prompt)
        self.assertIn('visual bundle',prompt)
        self.assertNotIn('tools',create.call_args.kwargs)

    def test_layout_correction_cannot_discard_findings(self):
        wrong=report_fixture();wrong.knowledge_items=[]
        with self.assertRaisesRegex(ValueError,'changed other report content'):
            self.run_report(self.bad_report(),wrong.model_dump_json())

    def test_unreadable_output_still_fails_after_bounded_corrections(self):
        bad=self.bad_report()
        with self.assertRaisesRegex(ValueError,'after 2 correction attempts'):
            self.run_report(bad,bad.model_dump_json(),bad.model_dump_json())

    def test_browser_failure_is_not_reclassified_as_model_layout_error(self):
        client,create=client_for()
        with patch('app.mcp.render_contract.render_mermaid_to_png',side_effect=RuntimeError('Browser launch failed')):
            with self.assertRaisesRegex(RuntimeError,'Browser launch failed'):
                asyncio.run(validate_or_correct_report(report_fixture().model_dump_json(),client,[],
                    {'app/main.py'},validate_rendering=True))
        create.assert_not_called()

    def test_missing_target_does_not_attempt_to_mark_missing_repository_failed(self):
        api=Mock()
        api.set_status.side_effect=bridge.IngestResourceGone('Repository not found')
        repo=dict(repositoryId=3,projectId=2,owner='qa',name='repo')
        with patch.object(bridge,'run_pipeline') as pipeline:
            bridge.process(api,repo)
        api.set_status.assert_called_once_with(3,'SYNCING')
        pipeline.assert_not_called()


if __name__=='__main__':unittest.main()

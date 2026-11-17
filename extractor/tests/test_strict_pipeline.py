import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import prism_bridge as bridge
from app.core.llm_client import LLMClient, LLMError, get_verification_agent_client
from app.github.auth import fetch_repo_tree


class StrictPipelineTests(unittest.TestCase):
    def test_anonymous_404_explains_private_or_missing_without_guessing(self):
        import requests
        from app.mcp.public_session import PublicRepositorySession
        response = requests.Response()
        response.status_code = 404
        error = requests.HTTPError('Not Found', response=response)
        with patch.object(PublicRepositorySession, '_get', side_effect=error):
            with self.assertRaisesRegex(RuntimeError, 'may be private.*workspace.*retry sync'):
                PublicRepositorySession('qa', 'private').verify_public()

    def test_public_rate_limit_failure_is_not_reclassified_as_missing_installation(self):
        import requests
        from app.mcp.public_session import PublicRepositorySession
        response = requests.Response()
        response.status_code = 403
        error = requests.HTTPError('Rate limited', response=response)
        with patch.object(PublicRepositorySession, '_get', side_effect=error):
            with self.assertRaises(requests.HTTPError):
                PublicRepositorySession('qa', 'repo').verify_public()

    def test_renderer_timeout_is_configurable_and_visible(self):
        import os
        import subprocess
        import tempfile
        from app.utils import diagram_renderer
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {'MERMAID_RENDER_TIMEOUT_SECONDS': '123'}), patch.object(
                diagram_renderer, 'DIAGRAMS_DIR', Path(folder)), patch.object(
                diagram_renderer.shutil, 'which', return_value='mmdc'), patch.object(
                diagram_renderer.subprocess, 'run', side_effect=subprocess.TimeoutExpired('mmdc', 123)) as run:
            with self.assertRaisesRegex(RuntimeError, 'configured 123s'):
                diagram_renderer.render_mermaid_to_png('flowchart TB; A-->B', 'qa')
            self.assertEqual(run.call_args.kwargs['timeout'], 123)

    def test_verification_scores_cannot_be_fabricated_by_defaults(self):
        from app.core.models import VerificationReport
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            VerificationReport.model_validate({})

    def test_chart_uses_supplied_audit_values(self):
        from app.utils.charts import generate_capability_radar_chart
        result = SimpleNamespace(verification_report=SimpleNamespace(
            overall_trust_score=21, evidence_precision_score=43, subsystem_recall_coverage=65))
        with patch('matplotlib.axes.Axes.plot') as plot:
            image = generate_capability_radar_chart(result)
        self.assertEqual(plot.call_args.args[1], [21, 43, 65, 21])
        self.assertGreater(image.getbuffer().nbytes, 0)

    def test_legacy_mermaid_directive_is_normalized_without_changing_graph(self):
        from app.utils.diagram_renderer import clean_mermaid_code
        graph = '\nflowchart TB\n A["Input"] --> B["Output"]'
        source = "%%{{init: {{'theme': 'base', 'themeVariables': {{'fontSize': '15px'}}}}}}%%" + graph
        cleaned = clean_mermaid_code(source)
        self.assertTrue(cleaned.startswith('%%{init: {"theme": "base"'))
        self.assertTrue(cleaned.endswith(graph))

    def test_valid_mermaid_directive_is_unchanged(self):
        from app.utils.diagram_renderer import clean_mermaid_code
        source = '%%{init: {"theme": "base"}}%%\nflowchart TB\n A-->B'
        self.assertEqual(clean_mermaid_code(source), source)

    def test_invalid_legacy_mermaid_directive_is_not_hidden(self):
        from app.utils.diagram_renderer import clean_mermaid_code
        with self.assertRaises(ValueError):
            clean_mermaid_code('%%{{init: broken}}%%\nflowchart TB\n A-->B')

    def test_prompt_does_not_require_escaped_mermaid_directives(self):
        from app.prompts.agent_prompts import AGENT_SYSTEM_PROMPT
        self.assertNotIn('%%{{init:', AGENT_SYSTEM_PROMPT)

    def test_missing_workspace_connection_does_not_run_pipeline(self):
        api = Mock()
        api.github_token.side_effect = RuntimeError('Connect GitHub')
        repo = dict(repositoryId=1, projectId=2, owner='qa', name='repo', githubInstallationId='123')
        with patch.object(bridge, 'run_pipeline') as pipeline:
            bridge.process(api, repo)
        pipeline.assert_not_called()
        api.set_status.assert_any_call(1, 'FAILED', 'Connect GitHub')
        api.knowledge.assert_not_called()

    def test_confirmed_public_repository_does_not_request_token(self):
        api = Mock()
        repo = dict(repositoryId=1, projectId=2, owner='qa', name='repo', githubInstallationId=None)
        with patch('app.mcp.public_session.PublicRepositorySession.verify_public'), patch.object(bridge, 'run_pipeline', side_effect=RuntimeError('stop after access check')) as pipeline:
            bridge.process(api, repo)
        api.github_token.assert_not_called()
        pipeline.assert_called_once_with(repo, None)

    def test_unconfirmed_public_repository_stops_before_extraction(self):
        api = Mock()
        repo = dict(repositoryId=1, projectId=2, owner='qa', name='repo', githubInstallationId=None)
        with patch('app.mcp.public_session.PublicRepositorySession.verify_public', side_effect=RuntimeError('Not public')), patch.object(bridge, 'run_pipeline') as pipeline:
            bridge.process(api, repo)
        api.github_token.assert_not_called()
        pipeline.assert_not_called()
        api.set_status.assert_any_call(1, 'FAILED', 'Not public')

    def test_public_tool_cannot_read_another_repository(self):
        import asyncio
        from app.mcp.public_session import PublicRepositorySession
        session = PublicRepositorySession('qa', 'repo')
        with self.assertRaisesRegex(ValueError, 'outside'):
            asyncio.run(session.call_tool('get_file_contents', {'owner': 'other', 'path': 'README.md'}))

    def test_public_tree_requires_confirmed_visibility(self):
        metadata = Mock()
        metadata.json.return_value = {'default_branch': 'main', 'private': True}
        with patch('app.github.auth.requests.get', return_value=metadata):
            with self.assertRaisesRegex(RuntimeError, 'not confirmed public'):
                fetch_repo_tree(None, 'qa', 'repo')

    def test_public_tool_schema_and_file_content(self):
        import asyncio
        import json
        from app.mcp.public_session import PublicRepositorySession
        session = PublicRepositorySession('qa', 'repo')
        schema = asyncio.run(session.list_tools())
        self.assertEqual(schema.tools[0].input_schema['required'], ['path'])
        with patch.object(session, 'verify_public'), patch.object(session, '_get', return_value={
                'type': 'file', 'size': 5, 'encoding': 'base64', 'content': 'aGVsbG8='}):
            result = asyncio.run(session.call_tool('get_file_contents', {'path': 'README.md'}))
        self.assertEqual(json.loads(result.content[0].text)['content'], 'hello')

    def test_public_requests_do_not_attach_credentials(self):
        from app.mcp.public_session import PublicRepositorySession
        with patch('app.mcp.public_session.requests.get') as get:
            get.return_value.json.return_value = {'private': False}
            PublicRepositorySession('qa', 'repo').verify_public()
            self.assertNotIn('Authorization', get.call_args.kwargs['headers'])

    def test_empty_backend_token_is_rejected(self):
        api = bridge.PrismApi('http://example.invalid', 'test-key')
        response = Mock(status_code=200)
        response.json.return_value = {'token': ''}
        api.http.post = Mock(return_value=response)
        with self.assertRaisesRegex(RuntimeError, 'no GitHub'):
            api.github_token(1)

    def test_http_error_is_not_anonymous_access(self):
        api = bridge.PrismApi('http://example.invalid', 'test-key')
        response = Mock(status_code=404, text='Not connected')
        response.request.method = 'POST'
        response.request.path_url = '/token'
        api.http.post = Mock(return_value=response)
        with self.assertRaisesRegex(RuntimeError, '404'):
            api.github_token(1)

    def test_unknown_provider_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Unsupported'):
            LLMClient('typo-provider', 'test-key', 'explicit-model')

    def test_explicit_empty_key_does_not_use_report_key(self):
        with self.assertRaisesRegex(ValueError, 'API key'):
            LLMClient('gemini', '', 'explicit-model')

    def test_verifier_does_not_borrow_report_key(self):
        with patch('app.core.llm_client.LLM2_PROVIDER', 'gemini'), patch('app.core.llm_client.LLM2_API_KEY', ''), patch('app.core.llm_client.LLM1_API_KEY', 'report-key'):
            with self.assertRaisesRegex(ValueError, 'API key'):
                get_verification_agent_client()

    def test_github_error_propagates(self):
        with patch('app.github.auth.requests.get') as get:
            get.return_value.raise_for_status.side_effect = RuntimeError('GitHub unavailable')
            with self.assertRaisesRegex(RuntimeError, 'unavailable'):
                fetch_repo_tree('installation-token', 'qa', 'repo')
            self.assertEqual(get.call_count, 1)

    def test_actual_default_branch_is_used(self):
        metadata, tree = Mock(), Mock()
        metadata.json.return_value = {'default_branch': 'release/next'}
        tree.json.return_value = {'tree': [{'path': 'README.md'}]}
        with patch('app.github.auth.requests.get', side_effect=[metadata, tree]) as get:
            self.assertEqual(len(fetch_repo_tree('token', 'qa', 'repo')), 1)
            self.assertIn('release%2Fnext', get.call_args.args[0])

    def test_verification_failure_propagates(self):
        from app.core.verification_agent import VerificationAgent
        client = Mock()
        client.extract_json.side_effect = RuntimeError('Auditor offline')
        result = SimpleNamespace(tech_stack=[], knowledge_items=[], project_name='QA',
                                 inspected_files=[], architecture_mermaid_chart='',
                                 presentation_deck=SimpleNamespace(business_value='', roi_summary=''),
                                 developer_handover_guide=SimpleNamespace(execution_sequence_chart='', critical_workflows=[]),
                                 problem_statement='QA', analytics_metrics=SimpleNamespace(
                                     core_module_count=0, key_patterns_used=[]))
        with self.assertRaisesRegex(LLMError, 'Verification audit failed'):
            VerificationAgent(client).audit_extraction(result)
        client.extract_json.assert_called_once()

    def test_missing_local_renderer_fails_without_network(self):
        from app.utils.diagram_renderer import render_mermaid_to_png
        with patch('app.utils.diagram_renderer.shutil.which', return_value=None):
            with self.assertRaisesRegex(RuntimeError, 'Mermaid CLI is required'):
                render_mermaid_to_png('graph TD; A-->B', 'qa-render')

    def test_mermaid_preserves_native_geometry_for_font_measurement(self):
        import tempfile
        from app.utils import diagram_renderer
        with tempfile.TemporaryDirectory() as folder:
            def render(args, **kwargs):
                Path(args[args.index('-o') + 1]).write_bytes(b'x' * 501)
                return SimpleNamespace(returncode=0, stderr=b'')
            with patch.object(diagram_renderer, 'DIAGRAMS_DIR', Path(folder)), patch.object(
                    diagram_renderer.shutil, 'which', return_value='mmdc'), patch.object(
                    diagram_renderer.subprocess, 'run', side_effect=render) as run:
                diagram_renderer.render_mermaid_to_png('graph TD; A-->B', 'qa')
            args = run.call_args.args[0]
            self.assertNotIn('-w', args)
            self.assertNotIn('--size', args)
            self.assertEqual(args[args.index('-s') + 1], '2')

    def test_export_failure_prevents_synced_status(self):
        import types
        exporter = types.ModuleType('app.utils.exporter')
        exporter.generate_pdf_report = Mock(side_effect=RuntimeError('PDF failed'))
        slides = types.ModuleType('app.utils.pptx_exporter')
        slides.generate_pptx_deck = Mock()
        api = Mock()
        api.github_token.return_value = 'workspace-token'
        repo = dict(repositoryId=1, projectId=2, owner='qa', name='repo', githubInstallationId='123')
        result = Mock()
        with patch.dict(sys.modules, {'app.utils.exporter': exporter, 'app.utils.pptx_exporter': slides}), patch.object(bridge, 'run_pipeline', return_value=(result, [])), patch.object(bridge, 'to_ingest_items', return_value=[{}]):
            bridge.process(api, repo)
        api.set_status.assert_any_call(1, 'FAILED', 'PDF failed')
        self.assertNotIn(unittest.mock.call(1, 'SYNCED'), api.set_status.call_args_list)


if __name__ == '__main__':
    unittest.main()

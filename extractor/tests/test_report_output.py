import asyncio
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from report_fixture import report_fixture
from app.mcp.report_output import validate_or_correct_report


def client_for(*contents):
    create = Mock(side_effect=[SimpleNamespace(choices=[SimpleNamespace(
        message=SimpleNamespace(content=c, tool_calls=None))]) for c in contents])
    return SimpleNamespace(model='same-configured-model', client=SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=create)))), create


class ReportOutputTests(unittest.TestCase):
    def test_oversized_sequence_is_revised_without_changing_report_findings(self):
        correct = report_fixture()
        bad = correct.model_copy(deep=True)
        bad.developer_handover_guide.execution_sequence_chart += '\n participant Browser as Browser\n Browser->>A: Start'
        client, create = client_for(correct.model_dump_json())
        with patch('app.mcp.report_output.asyncio.sleep', new_callable=AsyncMock):
            result = asyncio.run(validate_or_correct_report(bad.model_dump_json(), client, [], {'app/main.py'}))
        self.assertEqual(result.model_dump(), correct.model_dump())
        create.assert_called_once()
        request = create.call_args.kwargs['messages'][-1]['content']
        self.assertIn('5 participants', request)
        self.assertIn('change ONLY the Mermaid field identified by loc', request)
        self.assertNotIn('tools', create.call_args.kwargs)

    def test_diagram_revision_cannot_drop_knowledge_items(self):
        bad = report_fixture()
        bad.developer_handover_guide.execution_sequence_chart += '\n participant Fifth as Extra'
        altered = report_fixture()
        altered.knowledge_items = []
        client, create = client_for(altered.model_dump_json())
        with patch('app.mcp.report_output.asyncio.sleep', new_callable=AsyncMock):
            with self.assertRaisesRegex(ValueError, 'changed other report content'):
                asyncio.run(validate_or_correct_report(bad.model_dump_json(), client, [], {'app/main.py'}))
        create.assert_called_once()

    def test_diagram_budget_still_fails_after_bounded_revisions(self):
        bad = report_fixture()
        bad.developer_handover_guide.execution_sequence_chart += '\n participant Fifth as Extra'
        content = bad.model_dump_json()
        client, create = client_for(content, content)
        with patch('app.mcp.report_output.asyncio.sleep', new_callable=AsyncMock):
            with self.assertRaisesRegex(ValueError, 'after 2 correction attempts'):
                asyncio.run(validate_or_correct_report(content, client, [], {'app/main.py'}))
        self.assertEqual(create.call_count, 2)

    def test_valid_output_needs_no_correction(self):
        client, create = client_for()
        result = asyncio.run(validate_or_correct_report(report_fixture().model_dump_json(),
                              client, [], {'app/main.py'}))
        self.assertEqual(result.project_name, report_fixture().project_name)
        create.assert_not_called()

    def test_risk_object_requests_schema_correction_without_source_tools(self):
        correct = report_fixture()
        finding = '[Medium] app/main.py: simulated parsing text. Proposed: raise parsing errors.'
        correct.developer_handover_guide.technical_debt_and_fragility = [finding]
        bad = correct.model_dump()
        bad['developer_handover_guide']['technical_debt_and_fragility'] = [
            {'priority': 'Medium', 'finding': 'simulated parsing text', 'source': 'app/main.py',
             'remediation': 'raise parsing errors'}]
        client, create = client_for(correct.model_dump_json())
        with patch('app.mcp.report_output.asyncio.sleep', new_callable=AsyncMock) as sleep:
            result = asyncio.run(validate_or_correct_report(json.dumps(bad), client,
                                [{'role': 'system', 'content': 'Existing source context'}], {'app/main.py'}))
        self.assertEqual(result.developer_handover_guide.technical_debt_and_fragility, [finding])
        create.assert_called_once()
        self.assertEqual(create.call_args.kwargs['model'], 'same-configured-model')
        self.assertNotIn('tools', create.call_args.kwargs)
        request = create.call_args.kwargs['messages'][-1]['content']
        self.assertIn('technical_debt_and_fragility', request)
        self.assertIn('string_type', request)
        self.assertIn('Authoritative JSON schema', request)
        sleep.assert_awaited_once_with(15)

    def test_invalid_output_still_fails_after_two_corrections(self):
        bad = report_fixture().model_dump()
        bad['developer_handover_guide']['technical_debt_and_fragility'] = [{'priority': 'Medium'}]
        content = json.dumps(bad)
        client, create = client_for(content, content)
        with patch('app.mcp.report_output.asyncio.sleep', new_callable=AsyncMock):
            with self.assertRaisesRegex(ValueError, 'after 2 correction attempts'):
                asyncio.run(validate_or_correct_report(content, client, [], {'app/main.py'}))
        self.assertEqual(create.call_count, 2)

    def test_schema_correction_does_not_bypass_unread_evidence(self):
        client, create = client_for()
        with self.assertRaisesRegex(ValueError, 'not inspected'):
            asyncio.run(validate_or_correct_report(report_fixture().model_dump_json(), client, [], set()))
        create.assert_not_called()

    def test_provider_error_is_not_replaced_with_default_report(self):
        client, create = client_for()
        create.side_effect = RuntimeError('Provider unavailable')
        with patch('app.mcp.report_output.asyncio.sleep', new_callable=AsyncMock):
            with self.assertRaisesRegex(RuntimeError, 'Provider unavailable'):
                asyncio.run(validate_or_correct_report('{', client, [], {'app/main.py'}))


if __name__ == '__main__':
    unittest.main()

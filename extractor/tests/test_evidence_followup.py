import asyncio
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from report_fixture import report_fixture
from app.mcp.agent import run_autonomous_extraction


def tool_message(paths):
    return SimpleNamespace(content=None, tool_calls=[SimpleNamespace(
        id=path, function=SimpleNamespace(name='get_file_contents', arguments=json.dumps({'path': path})))
        for path in paths])


class EvidenceFollowupTests(unittest.TestCase):
    def run_agent(self, read_missing):
        initially_read = ['app/main.py', 'app/service.py', 'app/model.py', 'requirements.txt']
        report = report_fixture()
        report.knowledge_items[0].evidence_ids = ['app/producer.py']
        final = SimpleNamespace(content=report.model_dump_json(), tool_calls=None)
        replies = [tool_message(initially_read), final]
        replies.extend([tool_message(['app/producer.py']), final] if read_missing else [final, final])
        create = Mock(side_effect=[SimpleNamespace(choices=[SimpleNamespace(message=m)]) for m in replies])
        llm = SimpleNamespace(model='test-only', client=SimpleNamespace(chat=SimpleNamespace(
            completions=SimpleNamespace(create=create))))
        reads = []

        async def read_tool(name, arguments):
            reads.append(arguments['path'])
            return SimpleNamespace(isError=False, content=[SimpleNamespace(text=json.dumps({
                'path': arguments['path'], 'content': 'def observed_function():\n    return True\n'}))])

        session = SimpleNamespace(list_tools=AsyncMock(return_value=SimpleNamespace(tools=[SimpleNamespace(
            name='get_file_contents', description='Read source', input_schema={'type': 'object'})])), call_tool=read_tool)
        with patch('app.mcp.agent.asyncio.sleep', new_callable=AsyncMock):
            result = asyncio.run(run_autonomous_extraction('qa', 'fixture', llm, session, validate_rendering=False,
                file_tree=[{'path': p} for p in initially_read + ['app/producer.py']]))
        return result, reads, create

    def test_missing_cited_file_is_read_before_accepting_report(self):
        (result, tools), reads, create = self.run_agent(True)
        self.assertIn('app/producer.py', result.inspected_files)
        self.assertEqual(reads.count('app/producer.py'), 1)
        self.assertEqual(len(tools), 5)
        self.assertEqual(create.call_count, 4)
        self.assertIn('Then reassess', str(create.call_args.kwargs['messages']))

    def test_ignored_followups_remain_a_failure(self):
        with self.assertRaisesRegex(ValueError, 'two inspection follow-ups'):
            self.run_agent(False)


if __name__ == '__main__':
    unittest.main()

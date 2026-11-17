import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image
from report_fixture import report_fixture
from scripts.regenerate_report_exports import prepare_diagrams


class ExportPreflightTests(unittest.TestCase):
    def test_collects_all_unreadable_views_before_export(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'wide.png'
            Image.new('RGB', (3494, 498), 'white').save(path)
            with patch('scripts.regenerate_report_exports.render_mermaid_to_png', return_value=str(path)) as render:
                with self.assertRaises(ValueError) as context:
                    prepare_diagrams(report_fixture(), 'qa', 'fixture')
            self.assertIn('System architecture', str(context.exception))
            self.assertIn('Primary sequence', str(context.exception))
            self.assertEqual(render.call_count, 2)

    def test_successful_views_are_available_to_both_exporters(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'readable.png'
            Image.new('RGB', (1200, 500), 'white').save(path)
            report = report_fixture()
            with patch('scripts.regenerate_report_exports.render_mermaid_to_png', return_value=str(path)) as render:
                images = prepare_diagrams(report, 'qa', 'fixture')
            self.assertEqual(set(images), {report.architecture_mermaid_chart,
                             report.developer_handover_guide.execution_sequence_chart})
            self.assertEqual(render.call_count, 2)


if __name__ == '__main__':
    unittest.main()

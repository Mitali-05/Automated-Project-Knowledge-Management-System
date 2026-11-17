import unittest
from app.mcp.source_metrics import measure_sources


class SourceMetricsTests(unittest.TestCase):
    def test_measures_only_inspected_code_and_sql(self):
        metrics=measure_sources({'README.md':'documentation\n', 'app.py':'# comment\n\npass\n',
                                 'schema.sql':'CREATE TABLE t(id int);\n', 'config.yml':'setting: true'})
        self.assertEqual(metrics['source_files'],2)
        self.assertEqual(metrics['physical_lines'],4)
        self.assertEqual(metrics['nonblank_lines'],3)
        self.assertEqual(metrics['kloc'],.004)
        self.assertEqual(metrics['scope'],'Inspected source files only')

    def test_empty_inspection_has_zero_observed_size(self):
        self.assertEqual(measure_sources({})['physical_lines'],0)

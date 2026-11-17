import sys
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from pptx import Presentation

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.utils import pptx_exporter as deck


class PresentationLayoutTests(unittest.TestCase):
    def test_wide_architecture_reports_actual_size_without_relaxing_limit(self):
        with self.assertRaisesRegex(ValueError, r'3494 x 498px.*11\.7pt.*minimum 18pt'):
            deck.validate_diagram_geometry(3494, 498, 'System architecture')
        self.assertGreaterEqual(deck.validate_diagram_geometry(1800, 500, 'Focused view'), 18)

    def test_long_content_survives_pagination_at_readable_size(self):
        prs = Presentation()
        prs.slide_width, prs.slide_height = deck.Inches(deck.SLIDE_W), deck.Inches(deck.SLIDE_H)
        source = ' '.join(f'evidence_{i}' for i in range(500)) + ' FINAL_SOURCE_SENTENCE'
        deck._text_slides(prs, 'Engineering findings', source, 'owner/repository')
        self.assertGreater(len(prs.slides), 1)
        output = []
        for slide in prs.slides:
            body = slide.shapes[-1]
            output.extend(body.text.split())
            self.assertLessEqual(len(body.text_frame.paragraphs), deck.LINES_PER_SLIDE)
            for p in body.text_frame.paragraphs:
                self.assertEqual(p.font.name, 'Arial')
                self.assertEqual(p.font.size.pt, 20)
            for shape in slide.shapes:
                self.assertGreaterEqual(shape.left, 0)
                self.assertGreaterEqual(shape.top, 0)
                self.assertLessEqual(shape.left + shape.width, prs.slide_width)
                self.assertLessEqual(shape.top + shape.height, prs.slide_height)
        self.assertEqual(output, source.split())

    def test_font_measurement_handles_wide_characters(self):
        text = 'W' * 150
        lines = deck._wrap(text)
        self.assertEqual(''.join(lines), text)
        limit = deck.CONTENT_W * 72 * 4 * .95
        self.assertTrue(all(deck._font(20).getlength(line) <= limit for line in lines))

    def test_images_are_not_stretched(self):
        prs = Presentation()
        image = BytesIO()
        Image.new('RGB', (300, 900), 'white').save(image, format='PNG')
        deck._image_slide(prs, 'Architecture', image, 'qa/repository', 'Source diagram')
        picture = next(s for s in prs.slides[0].shapes if s.shape_type == 13)
        self.assertAlmostEqual(picture.width / picture.height, 1 / 3, places=5)

    def test_contrast_pairs_meet_readability_threshold(self):
        def luminance(hex_color):
            values = [int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4)]
            values = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values]
            return sum(v * w for v, w in zip(values, (.2126, .7152, .0722)))
        for fg, bg in [('white', 'navy'), ('navy', 'white'), ('body', 'white'),
                       ('muted', 'white'), ('blue', 'white'),
                       ('warning', 'warning_bg'), ('success', 'success_bg')]:
            a, b = sorted([luminance(deck.COLORS[fg]), luminance(deck.COLORS[bg])])
            self.assertGreaterEqual((b + .05) / (a + .05), 4.5, f'{fg}/{bg}')

    def test_failed_diagram_does_not_generate_substitute(self):
        with patch.object(deck, 'render_mermaid_to_png', return_value=None):
            with self.assertRaisesRegex(RuntimeError, 'did not produce'):
                deck._diagram_slide(Presentation(), 'Architecture', 'flowchart TB; A-->B', 'qa', 'qa/repo')


if __name__ == '__main__':
    unittest.main()

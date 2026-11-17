import unittest
from io import BytesIO

import pymupdf
from pptx import Presentation
from pptx.util import Inches
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape

from app.utils.publication_contract import validate_pdf_publication, validate_pptx_publication
from app.utils import pptx_exporter as deck
from app.utils.diagram_renderer import REPORT_THEME, DIAGRAM_TEXT_PX, DIAGRAM_SCALE
from app.prompts.agent_prompts import AGENT_SYSTEM_PROMPT, report_output_schema


class PublicationContractTests(unittest.TestCase):
    def pdf(self, size=A4):
        out=BytesIO();c=canvas.Canvas(out,pagesize=size)
        c.drawString(48,700,'A source-backed report page');c.save()
        return out.getvalue()

    def presentation(self):
        p=Presentation();p.slide_width=Inches(deck.SLIDE_W);p.slide_height=Inches(deck.SLIDE_H)
        slide=deck._slide(p,'Source review','qa/fixture','Engineering')
        return p,slide

    def serialized(self, p):
        out=BytesIO();p.save(out);return out.getvalue()

    def test_mixed_orientation_and_rotation_are_rejected(self):
        validate_pdf_publication(self.pdf())
        with self.assertRaisesRegex(ValueError,'A4 portrait'):
            validate_pdf_publication(self.pdf(landscape(A4)))
        d=pymupdf.open(stream=self.pdf(),filetype='pdf');d[0].set_rotation(90)
        with self.assertRaisesRegex(ValueError,'A4 portrait'):
            validate_pdf_publication(d.tobytes())

    def test_serialized_off_slide_object_is_rejected(self):
        p,s=self.presentation()
        validate_pptx_publication(self.serialized(p))
        deck._textbox(s,'Outside page',13,2,2,1)
        with self.assertRaisesRegex(ValueError,'off-slide'):
            validate_pptx_publication(self.serialized(p))

    def test_text_overflow_is_rejected_without_font_shrinking(self):
        p,s=self.presentation()
        deck._textbox(s,'First line\nSecond line\nThird line',1,2,3,.5)
        with self.assertRaisesRegex(ValueError,'exceeds its box'):
            validate_pptx_publication(self.serialized(p))

    def test_prompt_uses_actual_schema_and_no_sample_project(self):
        schema=report_output_schema()
        for field in ('source_metrics','inspected_files','jira_context','verification_report'):
            self.assertNotIn(field,schema['properties'])
        for word in ('PayShield','PaymentCaptureService','flowchart LR','stateDiagram-v2\n'):
            self.assertNotIn(word,AGENT_SYSTEM_PROMPT)
        for text in ('## 1.', '## 7.', 'A4 portrait','18 pt','7.5 pt','CANNOT check rendered pages','<=4 participants'):
            self.assertIn(text,AGENT_SYSTEM_PROMPT)

    def test_diagram_font_geometry_matches_renderer_scale(self):
        for key in ('actorFontSize','messageFontSize','noteFontSize'):
            self.assertEqual(REPORT_THEME['sequence'][key]*DIAGRAM_SCALE,DIAGRAM_TEXT_PX)
        self.assertEqual(int(REPORT_THEME['themeVariables']['fontSize'].rstrip('px'))*DIAGRAM_SCALE,DIAGRAM_TEXT_PX)


if __name__=='__main__':unittest.main()

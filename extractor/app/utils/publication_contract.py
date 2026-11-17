"""Deterministic checks on serialized documents, never model self-certification."""
from io import BytesIO

import pymupdf
from pptx import Presentation


def validate_pdf_publication(data):
    with pymupdf.open(stream=data, filetype='pdf') as reader:
        if not len(reader):
            raise ValueError('PDF publication has no pages')
        for number, page in enumerate(reader, 1):
            width, height = page.mediabox.width, page.mediabox.height
            if abs(width - 595.276) > 1 or abs(height - 841.89) > 1 or page.rotation % 360:
                raise ValueError(f'PDF page {number} must be unrotated A4 portrait; got {width:.1f} x {height:.1f}')
            if not page.get_text().strip():
                raise ValueError(f'PDF page {number} has no extractable text')
            # Serialized text, including long paths and table cells, must stay on-page.
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines', []):
                    x0, y0, x1, y1 = line['bbox']
                    if x0 < -1 or y0 < -1 or x1 > width + 1 or y1 > height + 1:
                        raise ValueError(f'PDF page {number} contains clipped text')


def validate_pptx_publication(data):
    deck = Presentation(BytesIO(data))
    if not deck.slides or abs(deck.slide_width / deck.slide_height - 16 / 9) > .001:
        raise ValueError('Presentation must contain 16:9 slides')
    for number, slide in enumerate(deck.slides, 1):
        if str(slide.background.fill.fore_color.rgb) != 'FFFFFF':
            raise ValueError(f'Slide {number} must have a white background')
        for shape in slide.shapes:
            if shape.left < 0 or shape.top < 0 or shape.left + shape.width > deck.slide_width or shape.top + shape.height > deck.slide_height:
                raise ValueError(f'Slide {number} contains an off-slide object: {shape.name}')
            if not shape.has_text_frame:
                continue
            frame = shape.text_frame
            used_height = 0
            for paragraph in frame.paragraphs:
                if not paragraph.text:
                    continue
                font = paragraph.font
                if font.name != 'Arial' or font.size is None or font.size.pt < 11:
                    raise ValueError(f'Slide {number} has missing or unsupported typography: {shape.name}')
                # Exporters insert measured line breaks and disable PowerPoint autofit.
                # This catches overflow before opening the deck, without shrinking text.
                spacing = paragraph.line_spacing
                used_height += float(spacing) if hasattr(spacing, 'pt') else font.size * 1.2
            if used_height > shape.height - frame.margin_top - frame.margin_bottom + 12700:
                raise ValueError(f'Slide {number} text exceeds its box: {shape.name}')


def validate_publication_pair(pdf, pptx):
    validate_pdf_publication(pdf)
    validate_pptx_publication(pptx)

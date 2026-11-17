# app/utils/diagram_renderer.py
import os
import ast
import json
import logging
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

DIAGRAMS_DIR = Path("generated_diagrams")
DIAGRAMS_DIR.mkdir(parents=True, exist_ok=True)

# Export readability estimates use the same font size and raster scale as mmdc.
DIAGRAM_FONT_PX = 24
DIAGRAM_SCALE = 2
DIAGRAM_TEXT_PX = DIAGRAM_FONT_PX * DIAGRAM_SCALE

REPORT_THEME = {
    'theme': 'base', 'fontFamily': 'Arial',
    'themeVariables': {
        'fontFamily': 'Arial', 'fontSize': f'{DIAGRAM_FONT_PX}px', 'background': '#FFFFFF',
        'actorFontSize': f'{DIAGRAM_FONT_PX}px',
        'messageFontSize': f'{DIAGRAM_FONT_PX}px', 'noteFontSize': f'{DIAGRAM_FONT_PX}px',
        'primaryColor': '#EFF6FF', 'primaryTextColor': '#0F172A',
        'primaryBorderColor': '#2563EB', 'lineColor': '#475569',
        'secondaryColor': '#F0FDF4', 'secondaryTextColor': '#0F172A',
        'tertiaryColor': '#FAF5FF', 'tertiaryTextColor': '#0F172A',
        'clusterBkg': '#F8FAFC', 'clusterBorder': '#CBD5E1',
        'actorBkg': '#F4F8FD', 'actorTextColor': '#0F172A', 'actorBorder': '#2563EB',
        'signalColor': '#475569', 'signalTextColor': '#0F172A',
        'labelBoxBkgColor': '#FFFFFF', 'labelTextColor': '#0F172A',
        'noteBkgColor': '#FFFBEB', 'noteTextColor': '#78350F',
        'activationBkgColor': '#DBEAFE', 'activationBorderColor': '#2563EB',
        'cScale0': '#EFF6FF', 'cScaleLabel0': '#0F172A',
        'cScale1': '#F0FDF4', 'cScaleLabel1': '#0F172A',
        'cScale2': '#FAF5FF', 'cScaleLabel2': '#0F172A',
    },
    'flowchart': {'htmlLabels': False, 'useMaxWidth': False,
                  'curve': 'basis', 'nodeSpacing': 35, 'rankSpacing': 45},
    'sequence': {'useMaxWidth': False, 'wrap': True, 'mirrorActors': False,
                  'actorFontSize': DIAGRAM_FONT_PX, 'messageFontSize': DIAGRAM_FONT_PX,
                  'noteFontSize': DIAGRAM_FONT_PX},
}

def clean_mermaid_code(code: str) -> str:
    """Sanitizes syntax, unescapes quotes, and strips markdown fences while preserving valid shapes."""
    if not code:
        return ""
    c = code.strip().replace('\\n', '\n').replace('\\"', '"')
    
    # Strip markdown code fences cleanly
    cleaned_lines = []
    for line in c.splitlines():
        s = line.strip()
        if s.startswith("```mermaid") or s == "```":
            continue
        cleaned_lines.append(line)
    cleaned = "\n".join(cleaned_lines).strip()
    # Older prompts accidentally emitted Python format-string brace escaping.
    # Repair only that known configuration envelope; never rewrite graph syntax.
    if cleaned.startswith('%%{{init:'):
        end = cleaned.find('%%', 2)
        if end < 0:
            raise ValueError('Unterminated escaped Mermaid init directive')
        directive = cleaned[:end + 2].replace('{{', '{').replace('}}', '}')
        match = re.fullmatch(r'%%\{init:\s*(.*)\}%%', directive, flags=re.DOTALL)
        if not match:
            raise ValueError('Malformed escaped Mermaid init directive')
        try:
            config = ast.literal_eval(match.group(1))
            if not isinstance(config, dict):
                raise ValueError('Mermaid init configuration must be an object')
            canonical = '%%{init: ' + json.dumps(config) + '}%%'
        except (ValueError, SyntaxError, TypeError) as exc:
            raise ValueError('Invalid escaped Mermaid init configuration') from exc
        logging.getLogger(__name__).warning('Normalized legacy escaped Mermaid init directive')
        cleaned = canonical + cleaned[end + 2:]
    return cleaned


def prepare_report_diagram(mermaid_text: str) -> str:
    """Apply the publication theme without changing nodes, messages, or edges."""
    code = clean_mermaid_code(mermaid_text)
    if code.startswith('%%{init:'):
        match = re.match(r'^%%\{init:\s*(.*?)\}%%\s*', code, flags=re.DOTALL)
        if not match:
            raise ValueError('Malformed Mermaid init directive')
        try:
            config = ast.literal_eval(match.group(1))
        except (SyntaxError, ValueError):
            try:
                config = json.loads(match.group(1))
            except json.JSONDecodeError as exc:
                raise ValueError('Invalid Mermaid init configuration') from exc
        if not isinstance(config, dict):
            raise ValueError('Mermaid init configuration must be an object')
        code = code[match.end():]
    # Remove model-generated visual overrides; these are not architectural facts.
    code = re.sub(r'(?m)^\s*(?:classDef|style|linkStyle)\s+[^\n]*$', '', code)
    # Do NOT rewrite vertical flowcharts (TD/TB) to horizontal (LR).
    # Preserving vertical flow allows diagrams to fit natural A4 portrait page aspect ratios.
    return code.strip()


def render_mermaid_to_png(mermaid_text: str, filename_prefix: str) -> str:
    """Render locally with mmdc; never substitute a renderer or transmit diagrams to a CDN."""
    code = prepare_report_diagram(mermaid_text)
    if not code:
        raise ValueError("Mermaid diagram is empty")
    render_timeout = int(os.getenv('MERMAID_RENDER_TIMEOUT_SECONDS', '180'))
    if render_timeout <= 0:
        raise ValueError('MERMAID_RENDER_TIMEOUT_SECONDS must be positive')
    command = shutil.which("mmdc")
    if not command:
        raise RuntimeError("Mermaid CLI is required. Install @mermaid-js/mermaid-cli and ensure mmdc is on PATH.")
    output_png = DIAGRAMS_DIR / f"{filename_prefix}.png"
    # Remove this generated output so an earlier diagram cannot masquerade as success.
    output_png.unlink(missing_ok=True)
    tmp_path = None
    config_path = None
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".mmd", delete=False, encoding="utf-8") as tmp:
            tmp.write(code)
            tmp_path = tmp.name
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as cfg:
            json.dump(REPORT_THEME, cfg)
            config_path = cfg.name
        try:
            # --size rescales SVG text as well as its canvas. Native SVG geometry
            # plus a fixed device scale is required by the export readability checks.
            result = subprocess.run([command, "-i", tmp_path, "-o", str(output_png),
                                     "-b", "white", "-c", config_path,
                                     "-s", str(DIAGRAM_SCALE)],
                                    capture_output=True, timeout=render_timeout, shell=False)
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError(
                f"Diagram '{filename_prefix}' exceeded the configured {render_timeout}s rendering limit. "
                "Check Mermaid/browser output or simplify the source diagram."
            ) from exc
        if result.returncode != 0 or not output_png.exists() or output_png.stat().st_size <= 500:
            detail = result.stderr.decode("utf-8", errors="replace").strip()[:1500]
            raise RuntimeError("Mermaid CLI failed to produce a valid diagram: " + detail)
        return str(output_png.resolve())
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)
        if config_path:
            Path(config_path).unlink(missing_ok=True)

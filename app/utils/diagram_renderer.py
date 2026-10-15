# app/utils/diagram_renderer.py
import os
import re
import subprocess
import tempfile
import requests
from pathlib import Path

DIAGRAMS_DIR = Path("generated_diagrams")
DIAGRAMS_DIR.mkdir(parents=True, exist_ok=True)

def clean_mermaid_code(code: str) -> str:
    """Sanitizes syntax, unescapes quotes, and fixes nested parentheses in node labels."""
    if not code:
        return ""
    c = code.strip().replace('\\n', '\n').replace('\\"', '"')
    if c.startswith("```mermaid"): c = c[10:]
    if c.startswith("```"): c = c[3:]
    if c.endswith("```"): c = c[:-3]
    # Replace illegal parentheses inside ["..."] with square brackets
    return re.sub(r'\["([^"]+)"\]', lambda m: f'["{m.group(1).replace("(", "[").replace(")", "]")}"]', c).strip()

def render_mermaid_to_png(mermaid_text: str, filename_prefix: str) -> str | None:
    """
    Renders Mermaid code and saves it as a physical .png file on disk.
    Returns the absolute string path to the saved PNG file, or None if rendering fails.
    """
    code = clean_mermaid_code(mermaid_text)
    if not code:
        return None

    output_png = DIAGRAMS_DIR / f"{filename_prefix}.png"
    
    # ── Strategy 1: Local Mermaid CLI (mmdc) ──
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".mmd", delete=False, encoding="utf-8") as tmp:
            tmp.write(code)
            tmp_path = tmp.name

        cmd = [
            "mmdc", "-i", tmp_path, "-o", str(output_png),
            "-b", "white", "-s", "2", "-w", "1600"
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True, timeout=25)
        
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
            
        if res.returncode == 0 and output_png.exists() and output_png.stat().st_size > 1000:
            return str(output_png.resolve())
    except Exception as e:
        print(f"Local mmdc render notice: {e}. Attempting network fallback...")

    # ── Strategy 2: Direct Network POST to Kroki saved directly to file ──
    try:
        resp = requests.post(
            "[https://kroki.io/mermaid/png](https://kroki.io/mermaid/png)",
            data=code.encode("utf-8"),
            headers={"Content-Type": "text/plain; charset=utf-8"},
            timeout=15
        )
        if resp.status_code == 200 and len(resp.content) > 1000:
            with open(output_png, "wb") as f:
                f.write(resp.content)
            return str(output_png.resolve())
    except Exception as e:
        print(f"Kroki file save failed: {e}")

    return None
# app/utils/diagram_renderer.py
import os
import re
import shutil
import base64
import subprocess
import tempfile
import requests
from pathlib import Path

DIAGRAMS_DIR = Path("generated_diagrams")
DIAGRAMS_DIR.mkdir(parents=True, exist_ok=True)

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
    return "\n".join(cleaned_lines).strip()


def render_mermaid_to_png(mermaid_text: str, filename_prefix: str) -> str | None:
    """
    Renders Mermaid code and saves it as a high-resolution .png file on disk.
    Multi-tier strategy:
      1. Local mmdc CLI (if installed)
      2. Kroki network POST API
      3. Mermaid.ink CDN fallback
    Returns the absolute string path to the saved PNG file, or None if all fail.
    """
    code = clean_mermaid_code(mermaid_text)
    if not code:
        return None

    output_png = DIAGRAMS_DIR / f"{filename_prefix}.png"

    # ── Strategy 1: Local Mermaid CLI (mmdc) if installed ──
    if shutil.which("mmdc"):
        try:
            with tempfile.NamedTemporaryFile("w", suffix=".mmd", delete=False, encoding="utf-8") as tmp:
                tmp.write(code)
                tmp_path = tmp.name

            cmd = [
                "mmdc", "-i", tmp_path, "-o", str(output_png),
                "-b", "white", "-s", "2", "-w", "1600"
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True, timeout=15)
            
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
            if res.returncode == 0 and output_png.exists() and output_png.stat().st_size > 500:
                return str(output_png.resolve())
        except Exception as e:
            print(f"Local mmdc render notice: {e}. Falling back to network...")

    # ── Strategy 2: Direct Network POST to Kroki ──
    try:
        resp = requests.post(
            "https://kroki.io/mermaid/png",
            data=code.encode("utf-8"),
            headers={"Content-Type": "text/plain; charset=utf-8"},
            timeout=3
        )
        if resp.status_code == 200 and len(resp.content) > 500:
            with open(output_png, "wb") as f:
                f.write(resp.content)
            return str(output_png.resolve())
    except Exception as e:
        # Gracefully fall back to Mermaid.ink CDN
        pass

    # ── Strategy 3: Mermaid.ink CDN GET fallback ──
    try:
        b64 = base64.b64encode(code.encode("utf-8")).decode("ascii")
        url = f"https://mermaid.ink/img/{b64}"
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200 and len(resp.content) > 500:
            with open(output_png, "wb") as f:
                f.write(resp.content)
            return str(output_png.resolve())
    except Exception as e:
        print(f"Mermaid.ink fallback failed: {e}")

    return None
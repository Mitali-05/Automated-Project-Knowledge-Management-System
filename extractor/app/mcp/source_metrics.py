"""Measured inspected-source size, never a claim about whole-repository KLOC."""
from pathlib import PurePosixPath
from app.mcp.inspection_contract import CODE_SUFFIXES


def measure_sources(sources):
    files={p:text for p,text in sources.items() if PurePosixPath(p).suffix in CODE_SUFFIXES | {'.sql'}}
    physical=sum(len(text.splitlines()) for text in files.values())
    return dict(scope='Inspected source files only', source_files=len(files), physical_lines=physical,
                nonblank_lines=sum(sum(bool(line.strip()) for line in text.splitlines()) for text in files.values()),
                kloc=round(physical/1000,3), definition='Physical lines including comments and blanks; not whole-repository size')

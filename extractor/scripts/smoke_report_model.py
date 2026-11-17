"""Test the configured report model on saved source bodies; no GitHub/DB writes.

Each source-json entry must map an exact repository path to its complete text.
This exercises the real prompt, model, bounded correction, Mermaid and both exports.
It does not run the separate verification model or establish runtime correctness.
"""
import argparse
import asyncio
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.llm_client import get_report_agent_client
from app.mcp.report_output import validate_or_correct_report
from app.mcp.source_metrics import measure_sources
from app.prompts.agent_prompts import AGENT_SYSTEM_PROMPT
from app.utils.exporter import generate_pdf_report
from app.utils.pptx_exporter import generate_pptx_deck


async def run(args):
    sources = json.loads(args.source_json.read_text(encoding='utf-8'))
    if not isinstance(sources, dict) or not sources or not all(isinstance(k, str) and isinstance(v, str) for k,v in sources.items()):
        raise ValueError('source-json must contain exact file paths mapped to complete source strings')
    if args.output.exists():
        raise ValueError('Choose a new output folder to preserve earlier smoke results')
    client = get_report_agent_client()
    client.client = client.client.with_options(timeout=90, max_retries=0)
    print(f'Testing configured model: {client.provider} / {client.model}', flush=True)
    messages = [
        {'role':'system', 'content':AGENT_SYSTEM_PROMPT.replace('{owner}',args.owner).replace('{repo}',args.repo)},
        {'role':'user', 'content': 'Complete source bodies captured from the repository follow as JSON. '
         'They have already been read for this isolated test; no tools are available. '
         'Use only this evidence and identify the limited scope. Generate the complete report JSON.\n'
         + json.dumps(sources)},
    ]
    response = client.client.chat.completions.create(model=client.model, temperature=0,
                response_format={'type':'json_object'}, messages=messages)
    result = await validate_or_correct_report(response.choices[0].message.content or '',client,messages,
                set(sources),validate_rendering=True)
    result.source_metrics = measure_sources(sources)
    pdf = generate_pdf_report(result,args.owner,args.repo)
    deck = generate_pptx_deck(result,args.owner,args.repo)
    args.output.mkdir(parents=True)
    (args.output/'report.json').write_text(result.model_dump_json(indent=2),encoding='utf-8')
    (args.output/'architecture-review.pdf').write_bytes(pdf)
    (args.output/'engineering-review.pptx').write_bytes(deck)
    (args.output/'test-scope.json').write_text(json.dumps(dict(
        provider=client.provider,model=client.model,source_files=list(sources),
        prompt_sha256=hashlib.sha256(AGENT_SYSTEM_PROMPT.encode()).hexdigest(),
        runtime_tests_executed=False,verification_model_executed=False,database_writes=False),indent=2))
    print('Model, Mermaid and serialized publication checks passed. Visual inspection still required.')
    print(args.output.resolve())


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-json',type=Path,required=True)
    parser.add_argument('--owner',required=True)
    parser.add_argument('--repo',required=True)
    parser.add_argument('--output',type=Path,required=True)
    try:
        asyncio.run(run(parser.parse_args()))
    except Exception as exc:
        # Provider errors can include request metadata; never echo credentials.
        if isinstance(exc, ImportError) and 'socks' in str(exc).lower():
            reason = 'The environment selects a SOCKS proxy but its Python transport dependency is missing.'
        elif isinstance(exc, (ValueError, RuntimeError)):
            reason = str(exc)
        else:
            reason = 'The configured model request could not complete. Check provider access and client dependencies.'
        print(f'Model smoke test failed ({type(exc).__name__}): {reason} No replacement documents were published.',file=sys.stderr)
        raise SystemExit(1)

"""Bounded same-model correction of invalid JSON/schema output; no coercion."""
import asyncio
import json
import logging
import re

from pydantic import ValidationError

from app.core.models import AgentExtractionResult
from app.core.comm_logger import log_llm1_error, log_llm1_request, log_llm1_response
from app.mcp.inspection_contract import DiagramContractError, validate_report_contract

logger = logging.getLogger(__name__)
MAX_SCHEMA_CORRECTIONS = 2


def _parse(content):
    text = content.strip()
    match = re.fullmatch(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if match:
        text = match.group(1)
    try:
        return AgentExtractionResult.model_validate_json(text)
    except ValidationError:
        repaired = re.sub(r'\\(?![/"\\bfnrt]|u[0-9a-fA-F]{4})', r'\\\\', text)
        return AgentExtractionResult.model_validate_json(repaired)


def _non_diagram_content(result, path=('developer_handover_guide', 'execution_sequence_chart')):
    data = result.model_dump(exclude={'inspected_files'})
    container = data
    for key in path[:-1]:
        container = container[key]
    container.pop(path[-1], None)
    return data


def _non_visual_content(result):
    data=result.model_dump(exclude={'inspected_files','architecture_mermaid_chart','architecture_explanation',
        'sequence_explanation','technical_diagrams','milestone_timeline_mermaid_chart'})
    for key in ('execution_sequence_chart','directory_dependency_chart'):
        data['developer_handover_guide'].pop(key,None)
    return data


async def validate_or_correct_report(content, llm_client, messages, inspected_files,
                                     project_id='', step=0, validate_rendering=False):
    """Ask for schema fixes twice at most, using existing source context.

    Invalid dictionaries are never converted to strings by application code.
    Semantic inspection/diagram checks run after parsing and are not bypassed.
    A provider/network failure still propagates normally.
    """
    conversation = list(messages)
    protected_content = None
    visual_bundle = False
    render_cache = {}
    diagram_path = ('developer_handover_guide', 'execution_sequence_chart')
    for attempt in range(MAX_SCHEMA_CORRECTIONS + 1):
        try:
            result = _parse(content)
            actual = _non_visual_content(result) if visual_bundle else _non_diagram_content(result, diagram_path)
            if protected_content is not None and actual != protected_content:
                logger.warning('Diagram correction changed other report content; accepting updated report after contract validation')
            validate_report_contract(result, inspected_files)
            if validate_rendering:
                from app.mcp.render_contract import validate_rendered_report
                await asyncio.to_thread(validate_rendered_report, result, render_cache)
        except (ValidationError, DiagramContractError) as exc:
            diagram_error = isinstance(exc, DiagramContractError)
            if diagram_error:
                diagram_path = exc.path
                visual_bundle = visual_bundle or getattr(exc,'visual_bundle',False)
                protected_content = _non_visual_content(result) if visual_bundle else _non_diagram_content(result, diagram_path)
            errors = ([{'type': 'diagram_contract', 'loc': list(diagram_path),
                        'msg': str(exc)}] if diagram_error else exc.errors(include_input=False, include_url=False))
            diagnostic = json.dumps(errors, default=str)
            if project_id:
                log_llm1_error(project_id, step + attempt, diagnostic,
                               context=f'Output schema validation; corrections used={attempt}')
            if attempt == MAX_SCHEMA_CORRECTIONS:
                raise ValueError(f'Report remains invalid after {attempt} correction attempts: {diagnostic}') from exc
            logger.warning('Report validation failed; requesting correction %s/%s without re-exploring source: %s',
                           attempt + 1, MAX_SCHEMA_CORRECTIONS, diagnostic)
            conversation.extend([
                {'role': 'assistant', 'content': content},
                {'role': 'user', 'content': (
                    'Correct only the JSON/schema or diagram errors below using the source already inspected. '
                    'Return the COMPLETE corrected JSON, without tool calls. Preserve supported findings and references; '
                    'do not invent facts, drop findings, or substitute empty/default values to evade validation. '
                    'technical_debt_and_fragility must contain strings; combine any priority/finding/source/remediation '
                    'fields into plain text strings without losing their content. '
                    +
                    ('For rendering/readability errors, revise only the visual bundle: architecture_mermaid_chart, '
                     'architecture_explanation, sequence_explanation, technical_diagrams, milestone_timeline_mermaid_chart, '
                     'and the two Mermaid fields in developer_handover_guide. Copy ALL knowledge, risks, workflows, '
                     'setup instructions and other report data verbatim. Preserve all real components and interactions '
                     'across focused source-cited views. Use short labels and put full mechanisms in explanations. '
                     'Do not turn failures into success paths, omit material relationships or invent merged services. '
                     'Use flowchart TD with short quoted labels, normally 2-3 components per horizontal rank. '
                     'Put distinct concerns in complete focused views, not cropped fragments. '
                     'The PDF must stay A4 portrait and the deck stays 16:9; never change page size or shrink fonts. '
                     'Use the provided rendered dimensions and effective font-size diagnostic to improve the composition. '
                     'Keep each view compact rather than one long chain. '
                     if visual_bundle else
                     'For a diagram error, change ONLY the Mermaid field identified by loc below; copy all other JSON values verbatim. ')
                    +
                    'Keep at most FOUR distinct participants '
                    '(including the user actor and implicit message endpoints), autonumber, and at most twelve messages. '
                    'Focus on ONE supported interaction or subworkflow rather than the entire application. '
                    'For example, a worker-processing sequence can omit the browser and API gateway. '
                    'Do not merge different services into a fictional participant or invent responses. '
                    f'Validation errors: {diagnostic}\nAuthoritative JSON schema:\n'
                    + json.dumps(AgentExtractionResult.model_json_schema())
                )},
            ])
            await asyncio.sleep(15)
            if project_id:
                log_llm1_request(project_id, step + attempt + 1, conversation, llm_client.model, tools_count=0)
            response = llm_client.client.chat.completions.create(
                model=llm_client.model, temperature=0.0, messages=conversation)
            message = response.choices[0].message
            if message.tool_calls:
                raise ValueError('Schema correction unexpectedly requested tools; correction must use existing evidence')
            content = message.content or ''
            if project_id:
                log_llm1_response(project_id, step + attempt + 1, llm_client.model,
                                  response_content=content, finish_reason='stop', is_final_output=True)
            continue
        if attempt:
            logger.info('Report validated after %s correction attempt(s)', attempt)
        return result

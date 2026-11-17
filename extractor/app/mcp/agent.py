import json
import logging
import asyncio
from typing import List, Tuple
from app.core.models import KnowledgeItem, AgentExtractionResult
from mcp.client.session import ClientSession
from app.prompts.agent_prompts import AGENT_SYSTEM_PROMPT
from app.mcp.inspection_contract import inspection_deficits, UninspectedEvidenceError, prioritized_tree_paths
from app.mcp.report_output import validate_or_correct_report
from app.core.comm_logger import (
    log_llm1_request, log_llm1_response,
    log_llm1_tool_execution, log_llm1_error
)

logger = logging.getLogger(__name__)

async def run_autonomous_extraction(
    owner: str, 
    repo: str, 
    llm_client, 
    mcp_session: ClientSession, 
    max_steps: int = 30,
    file_tree: list = None,
    project_id: str = "",
    validate_rendering: bool = True
) -> Tuple[AgentExtractionResult | None, List[str]]:
    
    logger.info(f"Starting autonomous agent for {owner}/{repo}")
    
    # In app/mcp/agent.py, update tools_response loop:
    tools_response = await mcp_session.list_tools()
    
    # Restrict LLM1 strictly to read-only inspection tools
    READ_ONLY_TOOL_WHITELIST = {
        "get_file_contents", "read_file", "list_directory", 
        "get_file_tree", "list_commits", "get_commit"
    }

    openai_tools = []
    for t in tools_response.tools:
        if t.name in READ_ONLY_TOOL_WHITELIST or "read" in t.name or "get" in t.name:
            if "create" in t.name or "update" in t.name or "delete" in t.name or "push" in t.name:
                continue
            openai_tools.append({
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.input_schema
                }
            })
        
    tree_context = ""
    if file_tree:
        paths = prioritized_tree_paths(file_tree)
        tree_context = f"\n\nPrioritized repository paths (navigation hints, not verified behaviour; {len(paths)} of {len(file_tree)} tree entries shown):\n" + "\n".join(f"- {p}" for p in paths)
        
    system_prompt = AGENT_SYSTEM_PROMPT.replace("{owner}", owner).replace("{repo}", repo)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Please extract technical knowledge, architecture, and onboarding documentation from {owner}/{repo}.{tree_context}\n\nUse your 'get_file_contents' tool to read core files and inspect the code."}
    ]
    
    executed_tools = []
    inspected_files = set()
    inspected_sources = {}
    evidence_followups = 0
    permission_error = None
    
    for step in range(max_steps):
        logger.info(f"Agent step {step+1}/{max_steps}")
        
        # Slow down the agent loop to respect the strict Free Tier API Rate Limits
        if step > 0:
            await asyncio.sleep(15)
        
        # ── Log request to LLM1 ──
        if project_id:
            log_llm1_request(
                project_id=project_id,
                step=step + 1,
                messages=messages,
                model=llm_client.model,
                tools_count=len(openai_tools)
            )
        
        # Retry loop for API rate limit errors
        for retry in range(5):
            try:
                response = llm_client.client.chat.completions.create(
                    model=llm_client.model,
                    temperature=0.1,
                    messages=messages,
                    tools=openai_tools,
                )
                break
            except Exception as e:
                error_msg = str(e)
                if any(k in error_msg.lower() for k in ["429", "503", "ratelimit", "quota", "unavailable"]):
                    wait_time = 15 * (retry + 1)
                    logger.warning(f"Rate limit hit. Waiting {wait_time} seconds before retry {retry+1}...")
                    logger.warning(f"Google API Response: {error_msg}")
                    if project_id:
                        log_llm1_error(project_id, step + 1, error_msg, context=f"Rate limit retry {retry+1}")
                    await asyncio.sleep(wait_time)
                else:
                    if project_id:
                        log_llm1_error(project_id, step + 1, error_msg, context="Fatal API error")
                    raise e
        else:
            logger.error("Failed to recover from rate limit after retries.")
            if project_id:
                log_llm1_error(project_id, step + 1, "Exhausted all retries", context="Rate limit exhaustion")
            return None, executed_tools
        
        msg = response.choices[0].message
        
        if msg.tool_calls:
            # ── Log LLM1 response with tool calls ──
            tool_call_data = []
            for tc in msg.tool_calls:
                tool_call_data.append({
                    "id": tc.id,
                    "function_name": tc.function.name,
                    "arguments": tc.function.arguments[:2000]
                })
            
            if project_id:
                log_llm1_response(
                    project_id=project_id,
                    step=step + 1,
                    model=llm_client.model,
                    response_content=msg.content,
                    tool_calls=tool_call_data,
                    finish_reason="tool_calls"
                )
            
            messages.append(msg)
            
            for tc in msg.tool_calls:
                tool_name = tc.function.name
                tool_args = json.loads(tc.function.arguments)
                logger.info(f"Agent called tool: {tool_name}")
                executed_tools.append(tool_name)
                
                try:
                    mcp_res = await mcp_session.call_tool(tool_name, arguments=tool_args)
                    result_text = "\\n".join([c.text for c in mcp_res.content if hasattr(c, 'text')])
                    read_failed = bool(getattr(mcp_res, 'isError', False))
                except Exception as e:
                    result_text = f"Error executing tool: {str(e)}"
                    read_failed = True
                    logger.error(result_text)
                
                # ── Log tool execution ──
                if project_id:
                    log_llm1_tool_execution(
                        project_id=project_id,
                        step=step + 1,
                        tool_name=tool_name,
                        tool_args=tool_args,
                        tool_result=result_text,
                        tool_call_id=tc.id
                    )
                
                if "Resource not accessible by integration" in result_text or "Permission Denied" in result_text:
                    permission_error = result_text
                    logger.error(f"GitHub Permission Error encountered: {result_text}")
                    read_failed = True

                if len(result_text) > 80000:
                    result_text = 'Tool result exceeds the inspection limit. Request one file or a smaller line range; this response was not inspected.'
                    read_failed = True
                if not read_failed and tool_name in {'get_file_contents', 'read_file'}:
                    path = tool_args.get('path')
                    if isinstance(path, str) and path:
                        payload = None
                        try:
                            payload = json.loads(result_text)
                            is_file = isinstance(payload, dict) and 'content' in payload and not payload.get('error')
                        except json.JSONDecodeError:
                            is_file = (bool(result_text.strip()) and not result_text.startswith('Error')
                                       and not result_text.lstrip().startswith(('{', '[')))
                        if is_file:
                            inspected_files.add(path.lstrip('/'))
                            source = payload.get('content') if isinstance(payload, dict) else result_text
                            if isinstance(source, str):
                                inspected_sources[path.lstrip('/')] = source
                    
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": tool_name,
                    "content": result_text
                })
        else:
            content = msg.content or ""
            deficits = inspection_deficits(file_tree, inspected_files)
            if deficits:
                messages.append({'role': 'assistant', 'content': content})
                messages.append({'role': 'user', 'content': 'Inspection is incomplete. ' + '\n'.join(deficits)})
                continue
            logger.info("Agent finished exploration. Parsing JSON.")
            
            # ── Log final LLM1 response ──
            if project_id:
                log_llm1_response(
                    project_id=project_id,
                    step=step + 1,
                    model=llm_client.model,
                    response_content=content,
                    finish_reason="stop",
                    is_final_output=True
                )
            
            try:
                result = await validate_or_correct_report(
                    content, llm_client, messages, inspected_files, project_id, step + 1, validate_rendering=validate_rendering)
                from app.mcp.source_metrics import measure_sources
                result.source_metrics = measure_sources(inspected_sources)
                return result, executed_tools
            except UninspectedEvidenceError as exc:
                if evidence_followups >= 2:
                    raise ValueError(f'Evidence remains unread after two inspection follow-ups: {", ".join(exc.paths)}') from exc
                evidence_followups += 1
                logger.warning('Resuming source inspection for unread citations (%s/2): %s',
                               evidence_followups, ', '.join(exc.paths))
                if project_id:
                    log_llm1_error(project_id, step + 1, str(exc), context='Unread citations; resuming inspection')
                messages.extend([
                    {'role': 'assistant', 'content': exc.report_json},
                    {'role': 'user', 'content': (
                        'The report is not accepted yet. Use the source-reading tools to inspect these cited files: '
                        + ', '.join(exc.paths) + '. Then reassess the associated claims against the returned source '
                        'and return the complete report. Reading a filename is not proof of a claim. '
                        'If a file cannot be read or the source contradicts a claim, explicitly revise the unsupported '
                        'finding rather than pretending it was verified. Preserve supported findings and do not '
                        'substitute citations to unrelated files merely to pass validation.'
                    )},
                ])
                continue
            except ValueError as e:
                logger.error(f"Failed to validate final report: {e}")
                logger.error(f"Raw model response was: {content[:500]}")
                if project_id:
                    log_llm1_error(project_id, step + 1, str(e), context=f"JSON parse failure. Raw: {content[:300]}")
                if permission_error:
                    raise PermissionError(
                        f"GitHub Permission Denied: '{permission_error}'. "
                        f"The GitHub App installation does not have permission to access repository '{owner}/{repo}'. "
                        f"Please ensure '{owner}/{repo}' is included in your GitHub App installation settings."
                    )
                raise ValueError(f"Report validation failed: {e}") from e

    logger.warning("Agent reached max steps. Forcing final JSON output.")
    deficits = inspection_deficits(file_tree, inspected_files)
    if deficits:
        raise ValueError('Extraction stopped with incomplete source inspection: ' + '; '.join(deficits))
    messages.append({"role": "user", "content": "You have reached your step limit. Output the JSON object matching the schema based ONLY on what you have found so far."})
    
    # ── Log forced final request ──
    if project_id:
        log_llm1_request(
            project_id=project_id,
            step=max_steps + 1,
            messages=messages,
            model=llm_client.model,
            tools_count=0
        )
    
    response = llm_client.client.chat.completions.create(
        model=llm_client.model,
        temperature=0.1,
        messages=messages,
    )
    content = response.choices[0].message.content or ""
    
    # ── Log forced final response ──
    if project_id:
        log_llm1_response(
            project_id=project_id,
            step=max_steps + 1,
            model=llm_client.model,
            response_content=content,
            finish_reason="stop",
            is_final_output=True
        )
    
    try:
        result = await validate_or_correct_report(
            content, llm_client, messages, inspected_files, project_id, max_steps + 1, validate_rendering=validate_rendering)
        from app.mcp.source_metrics import measure_sources
        result.source_metrics = measure_sources(inspected_sources)
        return result, executed_tools
    except ValueError as e:
        logger.error(f"Failed to validate forced final report: {e}")
        logger.error(f"Raw model response was: {content[:500]}")
        if project_id:
            log_llm1_error(project_id, max_steps + 1, str(e), context="Forced final parse failure")
        if permission_error:
            raise PermissionError(
                f"GitHub Permission Denied: '{permission_error}'. "
                f"The GitHub App installation does not have permission to access repository '{owner}/{repo}'."
            )
        raise ValueError(f"Report validation failed after exploration: {e}") from e

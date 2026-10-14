import json
import logging
import asyncio
from typing import List, Tuple
from app.core.models import KnowledgeItem, AgentExtractionResult
from mcp.client.session import ClientSession
from app.prompts.agent_prompts import AGENT_SYSTEM_PROMPT
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
    project_id: str = ""
) -> Tuple[AgentExtractionResult | None, List[str]]:
    
    logger.info(f"Starting autonomous agent for {owner}/{repo}")
    
    tools_response = await mcp_session.list_tools()
    
    openai_tools = []
    for t in tools_response.tools:
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
        paths = [item.get("path") for item in file_tree[:200] if item.get("path")]
        tree_context = f"\n\nHere is the repository file tree:\n" + "\n".join(f"- {p}" for p in paths)
        
    messages = [
        {"role": "system", "content": AGENT_SYSTEM_PROMPT.format(owner=owner, repo=repo)},
        {"role": "user", "content": f"Please extract technical knowledge, architecture, and onboarding documentation from {owner}/{repo}.{tree_context}\n\nUse your 'get_file_contents' tool to read core files and inspect the code."}
    ]
    
    executed_tools = []
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
                except Exception as e:
                    result_text = f"Error executing tool: {str(e)}"
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
                    
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": tool_name,
                    "content": result_text[:5000] # Prevent context overflow
                })
        else:
            content = msg.content or ""
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
                clean_content = content
                if "```json" in clean_content:
                    clean_content = clean_content.split("```json")[1].split("```")[0]
                elif "```" in clean_content:
                    clean_content = clean_content.split("```")[1].split("```")[0]
                    
                data = json.loads(clean_content.strip())
                result = AgentExtractionResult.model_validate(data)
                return result, executed_tools
            except Exception as e:
                logger.error(f"Failed to parse final JSON: {e}")
                logger.error(f"Raw model response was: {content[:500]}")
                if project_id:
                    log_llm1_error(project_id, step + 1, str(e), context=f"JSON parse failure. Raw: {content[:300]}")
                if permission_error:
                    raise PermissionError(
                        f"GitHub Permission Denied: '{permission_error}'. "
                        f"The GitHub App installation does not have permission to access repository '{owner}/{repo}'. "
                        f"Please ensure '{owner}/{repo}' is included in your GitHub App installation settings."
                    )
                raise ValueError(f"Agent did not return valid JSON output: {e}. Output was: {content[:200]}")

    logger.warning("Agent reached max steps. Forcing final JSON output.")
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
        clean_content = content
        if "```json" in clean_content:
            clean_content = clean_content.split("```json")[1].split("```")[0]
        elif "```" in clean_content:
            clean_content = clean_content.split("```")[1].split("```")[0]
            
        data = json.loads(clean_content.strip())
        result = AgentExtractionResult.model_validate(data)
        return result, executed_tools
    except Exception as e:
        logger.error(f"Failed to parse forced final JSON: {e}")
        logger.error(f"Raw model response was: {content[:500]}")
        if project_id:
            log_llm1_error(project_id, max_steps + 1, str(e), context="Forced final parse failure")
        if permission_error:
            raise PermissionError(
                f"GitHub Permission Denied: '{permission_error}'. "
                f"The GitHub App installation does not have permission to access repository '{owner}/{repo}'."
            )
        raise ValueError(f"Agent did not return valid JSON output after max steps: {e}")

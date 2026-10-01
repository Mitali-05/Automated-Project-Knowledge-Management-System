import json
import logging
import asyncio
from typing import List, Tuple
from app.core.models import KnowledgeItem
from mcp.client.session import ClientSession
from app.prompts.agent_prompts import AGENT_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

async def run_autonomous_extraction(
    owner: str, 
    repo: str, 
    llm_client, 
    mcp_session: ClientSession, 
    max_steps: int = 15
) -> Tuple[List[KnowledgeItem], List[str], str, List[str]]:
    
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
        
    messages = [
        {"role": "system", "content": AGENT_SYSTEM_PROMPT.format(owner=owner, repo=repo)},
        {"role": "user", "content": f"Please extract knowledge from {owner}/{repo}."}
    ]
    
    executed_tools = []
    
    for step in range(max_steps):
        logger.info(f"Agent step {step+1}/{max_steps}")
        
        # Slow down the agent loop to respect the strict Free Tier API Rate Limits
        if step > 0:
            await asyncio.sleep(15)
        
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
                    await asyncio.sleep(wait_time)
                else:
                    raise e
        else:
            logger.error("Failed to recover from rate limit after 3 retries.")
            return [], executed_tools, "", []
        
        msg = response.choices[0].message
        
        if msg.tool_calls:
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
                    
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": tool_name,
                    "content": result_text[:5000] # Prevent context overflow
                })
        else:
            content = msg.content
            logger.info("Agent finished exploration. Parsing JSON.")
            try:
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]
                    
                data = json.loads(content)
                items = [KnowledgeItem.model_validate(obj) for obj in data.get("knowledge_items", [])]
                problem_statement = data.get("problem_statement", "Problem statement unavailable.")
                tech_stack = data.get("tech_stack", [])
                return items, executed_tools, problem_statement, tech_stack
            except Exception as e:
                logger.error(f"Failed to parse final JSON: {e}")
                return [], executed_tools, "", []

    logger.warning("Agent reached max steps. Forcing final JSON output.")
    messages.append({"role": "user", "content": "You have reached your step limit. Output the JSON array of knowledge_items based ONLY on what you have found so far."})
    response = llm_client.client.chat.completions.create(
        model=llm_client.model,
        temperature=0.1,
        messages=messages,
    )
    content = response.choices[0].message.content
    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        data = json.loads(content)
        items = [KnowledgeItem.model_validate(obj) for obj in data.get("knowledge_items", [])]
        problem_statement = data.get("problem_statement", "Problem statement unavailable.")
        tech_stack = data.get("tech_stack", [])
        return items, executed_tools, problem_statement, tech_stack
    except Exception as e:
        logger.error(f"Failed to parse forced final JSON: {e}")
        return [], executed_tools, "", []

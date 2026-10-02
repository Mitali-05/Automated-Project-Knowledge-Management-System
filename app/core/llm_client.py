
import json
import anthropic
from app.core.config import LLM_PROVIDERS, DEFAULT_PROVIDER

class LLMError(Exception):
    pass

class LLMClient:
    def __init__(self, provider: str, api_key: str):
        if provider not in LLM_PROVIDERS:
            raise ValueError(f"Unknown provider '{provider}'. Choose one of {list(LLM_PROVIDERS)}.")
        if not api_key:
            raise ValueError("An API key is required for the selected LLM provider.")
            
        cfg = LLM_PROVIDERS[provider]
        self.provider = provider
        self.model = cfg["model"]
        self.client = anthropic.Anthropic(api_key=api_key)

    def extract_json(self, system_prompt: str, user_content: str, temperature: float = 0.1) -> dict:
        try:
            # Anthropic recommends putting the schema in the system prompt or user prompt 
            # and expecting JSON text out. (For structured output, tool use is native, but text parsing works).
            prompt = f"{system_prompt}\n\nHere is the codebase data:\n{user_content}"
            response = self.client.messages.create(
                model=self.model,
                temperature=temperature,
                max_tokens=8000,
                system="You are a JSON-only response bot. Output exactly the requested JSON, and nothing else.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
        except Exception as e:
            raise LLMError(f"{self.provider} call failed: {e}") from e

        raw = response.content[0].text
        # Clean up Markdown formatting if any
        if raw.startswith("```json"):
            raw = raw.replace("```json", "", 1)
        if raw.endswith("```"):
            raw = raw.rsplit("```", 1)[0]
            
        try:
            return json.loads(raw.strip())
        except json.JSONDecodeError as e:
            raise LLMError(f"{self.provider} did not return valid JSON: {e}\nRaw: {raw[:300]}") from e
        
def default_provider() -> str:
    return DEFAULT_PROVIDER

"""
Thin wrapper so the extractor doesn't care which provider it's talking to.

Gemini exposes an OpenAI-compatible endpoint at
https://generativelanguage.googleapis.com/v1beta/openai/ - so the same
`openai` SDK you were already using works unchanged, you just point base_url
at Google and use your Gemini API key (from https://aistudio.google.com/apikey,
free tier is generous and the context window is enormous compared to Groq's
free-tier TPM limit).

Why Gemini 2.5 Flash over Phi for this use case: Phi (Phi-3.5/Phi-4) is a
small model meant for local/edge inference - it's cheap to self-host but
noticeably weaker at long-context structured extraction with strict
evidence-ID citation, which is exactly what this task needs. Gemini Flash
gives you a ~1M token context window (so entire PRs, including full diffs,
fit without truncation) at a very low price, and is reliably good at
constrained JSON output. Groq is kept as a fallback provider since you
already had it configured.
"""
# app/llm_client.py
# app/llm_client.py
import json
from openai import OpenAI
from app.config import LLM_PROVIDERS, DEFAULT_PROVIDER

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
        
        # Strip 'models/' prefix automatically if present
        raw_model = cfg["model"]
        self.model = raw_model.replace("models/", "") if raw_model.startswith("models/") else raw_model
        
        self.client = OpenAI(api_key=api_key, base_url=cfg["base_url"])

    def extract_json(self, system_prompt: str, user_content: str, temperature: float = 0.1) -> dict:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                temperature=temperature,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
            )
        except Exception as e:
            raise LLMError(f"{self.provider} call failed: {e}") from e

        raw = response.choices[0].message.content
        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            raise LLMError(f"{self.provider} did not return valid JSON: {e}\nRaw: {raw[:300]}") from e
        
def default_provider() -> str:
    return DEFAULT_PROVIDER

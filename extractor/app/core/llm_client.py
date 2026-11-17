"""
Central LLM Client abstraction supporting OpenAI-compatible providers (Gemini, Groq, OpenAI)
and AWS Bedrock (Claude 3.5 Sonnet, Nova, Llama 3.1) for verification.
"""
import os
import json
import re
from openai import OpenAI
from app.core.config import (
    LLM_PROVIDERS, DEFAULT_PROVIDER, 
    LLM1_PROVIDER, LLM1_API_KEY, LLM1_MODEL,
    LLM2_PROVIDER, LLM2_API_KEY, LLM2_MODEL,
    AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
)

class LLMError(Exception):
    pass


class LLMOutputError(LLMError):
    """Invalid model output, distinct from a transport/provider failure.

    Keep the response for a bounded correction request; do not put its content
    into the exception message sent to the browser.
    """
    def __init__(self, message: str, raw_response: str):
        super().__init__(message)
        self.raw_response = raw_response


def parse_json_object(raw, provider: str) -> dict:
    if not isinstance(raw, str) or not raw.strip():
        raise LLMOutputError(f'{provider} returned empty JSON output', '')
    try:
        def reject_constant(value):
            raise ValueError(f'Non-JSON numeric constant: {value}')
        data = json.loads(raw, parse_constant=reject_constant)
    except (json.JSONDecodeError, ValueError) as exc:
        raise LLMOutputError(f'{provider} did not return valid JSON: {exc}', raw) from exc
    if not isinstance(data, dict):
        raise LLMOutputError(f'{provider} returned JSON that is not an object', raw)
    return data


class LLMClient:
    def __init__(self, provider: str = None, api_key: str = None, model: str = None):
        self.provider = (LLM1_PROVIDER if provider is None else provider).lower()
        
        # Bedrock Provider branch
        if self.provider == "bedrock":
            self.model = model or LLM2_MODEL
            self.region = AWS_REGION
            self.client = None
            try:
                import boto3
                kwargs = {"region_name": self.region}
                if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
                    kwargs["aws_access_key_id"] = AWS_ACCESS_KEY_ID
                    kwargs["aws_secret_access_key"] = AWS_SECRET_ACCESS_KEY
                self.bedrock_client = boto3.client("bedrock-runtime", **kwargs)
            except Exception as e:
                raise LLMError("AWS Bedrock initialization failed") from e
            return

        # OpenAI-compatible branch (Gemini / OpenAI)
        if self.provider in LLM_PROVIDERS:
            cfg = LLM_PROVIDERS[self.provider]
            base_url = cfg["base_url"]
            default_model = cfg["model"]
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider!r}")

        self.api_key = LLM1_API_KEY if api_key is None else api_key

        if not self.api_key:
            raise ValueError(f"An API key is required for provider '{self.provider}'. Set the selected agent API key in .env.")

        raw_model = LLM1_MODEL if model is None else model
        if not raw_model:
            raise ValueError("An explicit model is required for the selected agent")
        self.model = raw_model.replace("models/", "") if raw_model.startswith("models/") else raw_model
        self.client = OpenAI(api_key=self.api_key, base_url=base_url)

    def extract_json(self, system_prompt: str, user_content: str, temperature: float = 0.1) -> dict:
        # AWS Bedrock Converse branch
        if self.provider == "bedrock":
            if not self.bedrock_client:
                raise LLMError("AWS Bedrock client is not configured. Check AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION in .env.")
            try:
                response = self.bedrock_client.converse(
                    modelId=self.model,
                    messages=[
                        {"role": "user", "content": [{"text": user_content}]}
                    ],
                    system=[{"text": system_prompt + "\n\nCRITICAL: Respond ONLY with a valid JSON object. Do not wrap in markdown or conversational commentary."}],
                    inferenceConfig={"temperature": temperature, "maxTokens": 4096}
                )
                output_msg = response["output"]["message"]["content"][0]["text"].strip()
                # Clean possible code fence tags
                cleaned = re.sub(r"^```(?:json)?\s*", "", output_msg, flags=re.MULTILINE)
                cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE).strip()
            except Exception as e:
                raise LLMError(f"AWS Bedrock ({self.model}) call failed: {e}") from e
            return parse_json_object(cleaned, self.provider)

        # Standard OpenAI / Gemini branch
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
        return parse_json_object(raw, self.provider)

    def embed_text(self, text: str) -> list:
        try:
            import requests
            api_key = getattr(self, "api_key", None)
            if not api_key:
                raise ValueError("Embedding requires an explicitly configured API key")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key={api_key}"
            payload = {
                "model": "models/gemini-embedding-2",
                "content": {"parts": [{"text": text}]},
                "outputDimensionality": 768
            }
            response = requests.post(url, headers={"Content-Type": "application/json"}, json=payload, timeout=15)
            if response.status_code == 200:
                return response.json()["embedding"]["values"]
            
            response.raise_for_status()
            return response.json()["embedding"]["values"]
        except Exception as e:
            raise LLMError(f"Failed to generate embeddings: {e}") from e


def get_report_agent_client() -> LLMClient:
    """Returns LLMClient configured for ReportAgent (LLM1)."""
    return LLMClient(provider=LLM1_PROVIDER, api_key=LLM1_API_KEY, model=LLM1_MODEL)

def get_verification_agent_client() -> LLMClient:
    """Returns LLMClient configured for VerificationAgent (LLM2 / Bedrock)."""
    if LLM2_PROVIDER == "bedrock":
        return LLMClient(provider="bedrock", model=LLM2_MODEL)
    return LLMClient(provider=LLM2_PROVIDER, api_key=LLM2_API_KEY, model=LLM2_MODEL)

def default_provider() -> str:
    return LLM1_PROVIDER

"""
Central configuration. Nothing here is secret by itself - actual keys are
read from environment variables / the Streamlit sidebar at runtime, never
hardcoded and never logged.
"""
import os
from dotenv import load_dotenv

load_dotenv()

GITHUB_API = "https://api.github.com"

# Supported LLM providers, each OpenAI-compatible so we can reuse one client
# class. Gemini and Groq both expose an OpenAI-compatible /chat/completions
# endpoint; Phi (via Azure AI Foundry or Ollama) can be added the same way.
# app/config.py

# app/config.py

LLM_PROVIDERS = {
    "gemini-3.5-flash-lite": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "model": "gemini-3.5-flash-lite",
        "context_window_tokens": 1_000_000,
        "notes": "Best Free Tier Model: 15 Requests Per Minute, 500 Requests Per Day.",
    },
    "gemini-3.1-flash-lite": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "model": "gemini-3.1-flash-lite",
        "context_window_tokens": 1_000_000,
        "notes": "Backup Free Tier Model: 15 RPM, 500 Requests Per Day.",
    },
    "gemini-3.8-flash": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "model": "gemini-3.8-flash",
        "context_window_tokens": 1_000_000,
        "notes": "Strict Limits: 20 Requests Per Day on Free Tier.",
    },
    "gemini-2.0-flash": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "model": "gemini-2.0-flash",
        "context_window_tokens": 1_000_000,
        "notes": "Fast Agent (Latest 2.0 Stable): 1500 Requests Per Day on Free Tier.",
    },
}

DEFAULT_PROVIDER = "gemini-3.5-flash-lite"

# Token budget per single LLM call. Kept well under any provider's real
# limit so we have headroom for the system prompt + JSON response.
MAX_INPUT_TOKENS_PER_BATCH = int(os.getenv("MAX_INPUT_TOKENS_PER_BATCH", "6000"))

# Rough chars-per-token heuristic used when tiktoken isn't installed.
CHARS_PER_TOKEN_ESTIMATE = 4

# Source file fetching limits (Phase 3 "get me the code" requirement)
MAX_SOURCE_FILES = int(os.getenv("MAX_SOURCE_FILES", "12"))
MAX_FILE_BYTES = int(os.getenv("MAX_FILE_BYTES", "20_000"))
SOURCE_FILE_EXTENSIONS = (
    ".py", ".java", ".ts", ".tsx", ".js", ".jsx", ".go", ".rb",
    ".md", ".yml", ".yaml", ".json", ".sql",
)
SKIP_PATH_FRAGMENTS = ("node_modules/", "dist/", "build/", ".git/", "vendor/", "test/", "tests/")

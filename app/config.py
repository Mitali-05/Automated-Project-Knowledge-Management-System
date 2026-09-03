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
    "gemini-2.5-flash": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "model": "gemini-2.5-flash",
        "context_window_tokens": 1_000_000,
        "notes": "Best choice: High throughput, low latency, robust structured JSON.",
    },
    "gemini-3.6-flash": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "model": "gemini-3.6-flash",
        "context_window_tokens": 1_000_000,
        "notes": "Latest generation Gemini flash model.",
    },
    "gemini-2.5-flash-lite": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "model": "gemini-2.5-flash-lite",
        "context_window_tokens": 1_000_000,
        "notes": "Ultra-fast and highly efficient.",
    },
    "groq-oss-120b": {
        "base_url": "https://api.groq.com/openai/v1",
        "model": "openai/gpt-oss-120b",
        "context_window_tokens": 8_000,
        "notes": "Groq fallback.",
    },
}

DEFAULT_PROVIDER = "gemini-2.5-flash"

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

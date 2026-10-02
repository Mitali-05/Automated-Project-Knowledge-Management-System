
import os
from dotenv import load_dotenv

load_dotenv()

GITHUB_API = "https://api.github.com"

LLM_PROVIDERS = {
    "llama-3.3-70b-versatile": {
        "base_url": "https://api.groq.com/openai/v1",
        "model": "llama-3.3-70b-versatile",
        "context_window_tokens": 128000,
        "notes": "Groq's fast Llama 3.3 model.",
    },
    "mixtral-8x7b-32768": {
        "base_url": "https://api.groq.com/openai/v1",
        "model": "mixtral-8x7b-32768",
        "context_window_tokens": 32768,
        "notes": "Fast MoE model.",
    }
}

DEFAULT_PROVIDER = "llama-3.3-70b-versatile"

MAX_INPUT_TOKENS_PER_BATCH = int(os.getenv("MAX_INPUT_TOKENS_PER_BATCH", "6000"))
CHARS_PER_TOKEN_ESTIMATE = 4
MAX_SOURCE_FILES = int(os.getenv("MAX_SOURCE_FILES", "12"))
MAX_FILE_BYTES = int(os.getenv("MAX_FILE_BYTES", "20_000"))
SOURCE_FILE_EXTENSIONS = (
    ".py", ".java", ".ts", ".tsx", ".js", ".jsx", ".go", ".rb",
    ".md", ".yml", ".yaml", ".json", ".sql",
)
SKIP_PATH_FRAGMENTS = ("node_modules/", "dist/", "build/", ".git/", "vendor/", "test/", "tests/")


import os
from dotenv import load_dotenv

load_dotenv()

GITHUB_API = "https://api.github.com"

LLM_PROVIDERS = {
    "claude-3-5-sonnet-20241022": {
        "base_url": "https://api.anthropic.com",
        "model": "claude-3-5-sonnet-20241022",
        "context_window_tokens": 200000,
        "notes": "Anthropic Claude 3.5 Sonnet",
    }
}

DEFAULT_PROVIDER = "claude-3-5-sonnet-20241022"

MAX_INPUT_TOKENS_PER_BATCH = int(os.getenv("MAX_INPUT_TOKENS_PER_BATCH", "6000"))
CHARS_PER_TOKEN_ESTIMATE = 4
MAX_SOURCE_FILES = int(os.getenv("MAX_SOURCE_FILES", "12"))
MAX_FILE_BYTES = int(os.getenv("MAX_FILE_BYTES", "20_000"))
SOURCE_FILE_EXTENSIONS = (
    ".py", ".java", ".ts", ".tsx", ".js", ".jsx", ".go", ".rb",
    ".md", ".yml", ".yaml", ".json", ".sql",
)
SKIP_PATH_FRAGMENTS = ("node_modules/", "dist/", "build/", ".git/", "vendor/", "test/", "tests/")

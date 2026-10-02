
import os
from dotenv import load_dotenv

load_dotenv()

GITHUB_API = "https://api.github.com"

LLM_PROVIDERS = {
    "deepseek-chat": {
        "base_url": "https://api.deepseek.com",
        "model": "deepseek-chat",
        "context_window_tokens": 64000,
        "notes": "DeepSeek Chat Model (V3).",
    }
}

DEFAULT_PROVIDER = "deepseek-chat"

MAX_INPUT_TOKENS_PER_BATCH = int(os.getenv("MAX_INPUT_TOKENS_PER_BATCH", "6000"))
CHARS_PER_TOKEN_ESTIMATE = 4
MAX_SOURCE_FILES = int(os.getenv("MAX_SOURCE_FILES", "12"))
MAX_FILE_BYTES = int(os.getenv("MAX_FILE_BYTES", "20_000"))
SOURCE_FILE_EXTENSIONS = (
    ".py", ".java", ".ts", ".tsx", ".js", ".jsx", ".go", ".rb",
    ".md", ".yml", ".yaml", ".json", ".sql",
)
SKIP_PATH_FRAGMENTS = ("node_modules/", "dist/", "build/", ".git/", "vendor/", "test/", "tests/")

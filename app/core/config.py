"""
Central configuration for PRISM.
Environment settings for ReportAgent (LLM1) and VerificationAgent (LLM2 / AWS Bedrock).
"""
import os
from dotenv import load_dotenv

load_dotenv(override=True)

GITHUB_API = "https://api.github.com"

# Supported LLM providers
LLM_PROVIDERS = {
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "model": os.getenv("LLM1_MODEL", "gemini-3.5-flash-lite"),
        "context_window_tokens": 1_000_000,
        "notes": "Google Gemini via OpenAI-compatible endpoint.",
    },
    "gemini-3.5-flash-lite": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "model": "gemini-3.5-flash-lite",
        "context_window_tokens": 1_000_000,
        "notes": "Standard Model: Gemini 3.5 Flash Lite.",
    },
    "gemini-2.5-flash": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "model": "gemini-2.5-flash",
        "context_window_tokens": 1_000_000,
        "notes": "Fast Agent (Stable): Rapid synthesis.",
    },
    "gemini-3.1-flash-lite": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "model": "gemini-3.1-flash-lite",
        "context_window_tokens": 1_000_000,
        "notes": "Backup Model: Gemini 3.1 Flash Lite.",
    },
    "bedrock": {
        "base_url": "aws_bedrock",
        "model": os.getenv("LLM2_MODEL", "anthropic.claude-3-5-sonnet-20240620-v1:0"),
        "context_window_tokens": 200_000,
        "notes": "AWS Bedrock: Enterprise verification agent powered by Claude 3.5 Sonnet / Haiku / Nova.",
    }
}

# LLM 1 (Report / Synthesis Agent)
LLM1_PROVIDER = os.getenv("LLM1_PROVIDER", "gemini")
LLM1_MODEL = os.getenv("LLM1_MODEL", "gemini-3.5-flash-lite")
LLM1_API_KEY = os.getenv("LLM1_API_KEY") or os.getenv("LLM_API_KEY", "")

# LLM 2 (Verification Agent: Grounding, Evidence Checking & Metrics)
LLM2_PROVIDER = os.getenv("LLM2_PROVIDER", "bedrock")
LLM2_MODEL = os.getenv("LLM2_MODEL", "anthropic.claude-3-5-sonnet-20240620-v1:0")
LLM2_API_KEY = os.getenv("LLM2_API_KEY", "")

# AWS Bedrock Settings
AWS_REGION = os.getenv("AWS_REGION", "eu-north-1")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")

DEFAULT_PROVIDER = LLM1_PROVIDER

# Token budget per single LLM call
MAX_INPUT_TOKENS_PER_BATCH = int(os.getenv("MAX_INPUT_TOKENS_PER_BATCH", "16000"))
CHARS_PER_TOKEN_ESTIMATE = 4

# Source file fetching limits (Deep repository audit)
MAX_SOURCE_FILES = int(os.getenv("MAX_SOURCE_FILES", "60"))
MAX_FILE_BYTES = int(os.getenv("MAX_FILE_BYTES", "40000"))
SOURCE_FILE_EXTENSIONS = (
    ".py", ".java", ".ts", ".tsx", ".js", ".jsx", ".go", ".rb", ".cs", ".cpp", ".c",
    ".md", ".yml", ".yaml", ".json", ".sql", ".proto", ".graphql", ".toml", ".gradle", ".xml"
)
SKIP_PATH_FRAGMENTS = ("node_modules/", "dist/", "build/", ".git/", "vendor/", "target/")

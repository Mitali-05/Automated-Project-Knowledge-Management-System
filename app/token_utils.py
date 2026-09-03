"""
Approximate token counting so we can budget LLM calls instead of guessing
with a character cap (which is what caused the 413 in your Groq run - 45,000
characters is roughly 11,000+ tokens, well over an 8,000 TPM limit).

Uses tiktoken if it's installed (accurate), otherwise falls back to a
chars-per-token heuristic (good enough for budgeting, not exact).
"""
from app.config import CHARS_PER_TOKEN_ESTIMATE

try:
    import tiktoken
    _ENC = tiktoken.get_encoding("cl100k_base")
except Exception:
    _ENC = None


def count_tokens(text: str) -> int:
    if not text:
        return 0
    if _ENC is not None:
        return len(_ENC.encode(text))
    return max(1, len(text) // CHARS_PER_TOKEN_ESTIMATE)


def truncate_to_tokens(text: str, max_tokens: int) -> str:
    if count_tokens(text) <= max_tokens:
        return text
    if _ENC is not None:
        return _ENC.decode(_ENC.encode(text)[:max_tokens])
    max_chars = max_tokens * CHARS_PER_TOKEN_ESTIMATE
    return text[:max_chars]

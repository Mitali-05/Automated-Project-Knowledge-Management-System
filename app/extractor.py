"""
Turns a GitHub evidence bundle into cited KnowledgeItems.
"""
from app.config import MAX_INPUT_TOKENS_PER_BATCH
from app.token_utils import count_tokens, truncate_to_tokens
from app.models import KnowledgeItem

SYSTEM_PROMPT = """
You are a software-architecture knowledge extraction engine.

Analyze ONLY the supplied evidence. Never invent facts. Ignore trivial
activity such as typo/formatting-only changes or minor dependency updates with no explanation.

Extract supported knowledge of these types:
TECHNICAL_DECISION, MODULE_RESPONSIBILITY, IMPLEMENTATION_DETAIL,
CONFIGURATION, PROBLEM_RESOLUTION, DEPENDENCY.

REPOSITORY HANDLING INSTRUCTIONS:
1. TECHNICAL_DECISION items require explicit rationale stated in a commit message,
   PR description, review comment, or code comment.
2. MODULE_RESPONSIBILITY items should be derived directly from source file structure
   and file contents showing what a file/module actually does.
3. IF THERE ARE 0 PRS OR FEW COMMITS: Prioritize extracting MODULE_RESPONSIBILITY and
   CONFIGURATION items from the provided SOURCE files.

Every item MUST cite one or more supplied evidence IDs (e.g., SOURCE:path, COMMIT:sha, PR:num)
that genuinely support it.

Return JSON strictly matching this structure:
{"knowledge_items":[
 {"title":"...", "knowledge_type":"...", "summary":"...",
  "details":"...", "module":"... or null", "confidence":0.85,
  "evidence_ids":["..."]}
]}
"""


def _clip(text: str, max_chars: int) -> str:
    return (text or "")[:max_chars]


def build_evidence(bundle: dict) -> list[dict]:
    """Flattens the GitHub bundle into a list of evidence records."""
    evidence = []

    for c in bundle.get("commits", []):
        sha = c["sha"]
        eid = f"COMMIT:{sha[:12]}"
        msg = c.get("commit", {}).get("message", "")
        author = (c.get("author") or {}).get("login", "unknown")
        evidence.append({
            "id": eid, "source_type": "commit", "source_id": sha,
            "title": msg.splitlines()[0][:200] if msg else "(no message)",
            "url": c.get("html_url", ""),
            "excerpt": f"Author: {author}\nMessage: {msg}",
            "chunk_text": f"[{eid}]\nAuthor: {author}\nURL: {c.get('html_url', '')}\nMessage: {msg}",
        })

    for item in bundle.get("pull_requests", []):
        pr = item["pr"]
        n = pr["number"]
        eid = f"PR:{n}"
        author = (pr.get("user") or {}).get("login", "unknown")
        evidence.append({
            "id": eid, "source_type": "pull_request", "source_id": str(n),
            "title": pr.get("title", ""), "url": pr.get("html_url", ""),
            "excerpt": _clip(pr.get("body") or "(no description)", 300),
            "chunk_text": (
                f"[{eid}]\nTitle: {pr.get('title', '')}\nAuthor: {author}\n"
                f"URL: {pr.get('html_url', '')}\nDescription:\n{_clip(pr.get('body') or '(none)', 2000)}"
            ),
        })

        for f in item.get("files", []):
            feid = f"FILE:{n}:{f.get('filename')}"
            patch = _clip(f.get("patch") or "", 2000)
            evidence.append({
                "id": feid, "source_type": "changed_file", "source_id": f.get("sha", ""),
                "title": f.get("filename", ""), "url": pr.get("html_url", ""),
                "excerpt": f"status={f.get('status')}; +{f.get('additions', 0)} -{f.get('deletions', 0)}",
                "chunk_text": f"[{feid}]\nFile: {f.get('filename')}\nStatus: {f.get('status')}\nPatch:\n{patch}",
            })

        for r in item.get("reviews", []):
            reid = f"REVIEW:{r.get('id')}"
            reviewer = (r.get("user") or {}).get("login", "unknown")
            body = _clip(r.get("body") or "(no review body)", 1000)
            evidence.append({
                "id": reid, "source_type": "review", "source_id": str(r.get("id")),
                "title": f"Review by {reviewer}", "url": r.get("html_url", pr.get("html_url", "")),
                "excerpt": body,
                "chunk_text": f"[{reid}]\nReviewer: {reviewer}\nBody:\n{body}",
            })

        for c in item.get("comments", []):
            ceid = f"COMMENT:{c.get('id')}"
            commenter = (c.get("user") or {}).get("login", "unknown")
            body = _clip(c.get("body") or "(empty)", 1000)
            evidence.append({
                "id": ceid, "source_type": "comment", "source_id": str(c.get("id")),
                "title": f"Comment by {commenter}", "url": c.get("html_url", pr.get("html_url", "")),
                "excerpt": body,
                "chunk_text": f"[{ceid}]\nCommenter: {commenter}\nBody:\n{body}",
            })

    for f in bundle.get("source_files", []):
        path = f["path"]
        seid = f"SOURCE:{path}"
        content = _clip(f["content"], 3000)
        evidence.append({
            "id": seid, "source_type": "source_file", "source_id": path,
            "title": path, "url": "", "excerpt": f"{len(f['content'])} bytes",
            "chunk_text": f"[{seid}]\nFile: {path}\nContent:\n{content}",
        })

    return evidence


def batch_evidence(evidence: list[dict], max_tokens: int = MAX_INPUT_TOKENS_PER_BATCH) -> list[list[dict]]:
    """Greedy bin-packing that fits items into token budgets."""
    batches, current, current_tokens = [], [], 0
    for item in evidence:
        text = item["chunk_text"]
        tokens = count_tokens(text)
        if tokens > max_tokens:
            item = dict(item)
            item["chunk_text"] = truncate_to_tokens(text, max_tokens - 50)
            tokens = count_tokens(item["chunk_text"])
        if current and current_tokens + tokens > max_tokens:
            batches.append(current)
            current, current_tokens = [], 0
        current.append(item)
        current_tokens += tokens
    if current:
        batches.append(current)
    return batches


def _dedupe(items: list[KnowledgeItem]) -> list[KnowledgeItem]:
    seen = set()
    unique = []
    for item in items:
        key = item.title.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def extract_knowledge(bundle: dict, llm_client, max_tokens_per_batch: int = MAX_INPUT_TOKENS_PER_BATCH):
    """
    Executes batched LLM extraction calls and merges results.
    """
    evidence = build_evidence(bundle)
    if not evidence:
        return [], [], 0

    batches = batch_evidence(evidence, max_tokens_per_batch)
    valid_ids = {e["id"] for e in evidence}

    all_items: list[KnowledgeItem] = []
    for batch in batches:
        context = "\n\n".join(e["chunk_text"] for e in batch)
        user_prompt = "Extract knowledge from this evidence:\n\n" + context
        data = llm_client.extract_json(SYSTEM_PROMPT, user_prompt)

        for obj in data.get("knowledge_items", []):
            obj["evidence_ids"] = [x for x in obj.get("evidence_ids", []) if x in valid_ids]
            if not obj["evidence_ids"]:
                continue
            try:
                all_items.append(KnowledgeItem.model_validate(obj))
            except Exception:
                continue

    return _dedupe(all_items), evidence, len(batches)
import re

from app.config import CHUNK_OVERLAP, CHUNK_SIZE


def split_text(text: str) -> list[str]:
    normalized = normalize_text(text)
    if not normalized:
        return []

    chunks: list[str] = []
    current = ""

    for part in semantic_parts(normalized):
        candidate = f"{current} {part}".strip() if current else part
        if len(candidate) <= CHUNK_SIZE:
            current = candidate
            continue

        if current:
            chunks.append(current)
        overlap = current[-CHUNK_OVERLAP:].strip() if CHUNK_OVERLAP > 0 else ""
        current = f"{overlap} {part}".strip() if overlap else part

        while len(current) > CHUNK_SIZE:
            chunks.append(current[:CHUNK_SIZE].strip())
            current = current[max(0, CHUNK_SIZE - CHUNK_OVERLAP) :].strip()

    if current:
        chunks.append(current)

    return chunks


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def semantic_parts(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?;:])\s+|\s+-\s+|\n+", text)
    useful = [part.strip() for part in parts if len(part.strip()) >= 12]
    return useful or [text]

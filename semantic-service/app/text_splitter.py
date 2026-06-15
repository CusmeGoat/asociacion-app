from app.config import CHUNK_OVERLAP, CHUNK_SIZE


def split_text(text: str) -> list[str]:
    normalized = " ".join(text.split())
    if not normalized:
        return []

    chunks: list[str] = []
    start = 0
    length = len(normalized)

    while start < length:
        end = min(start + CHUNK_SIZE, length)
        chunk = normalized[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= length:
            break
        start = max(0, end - CHUNK_OVERLAP)

    return chunks

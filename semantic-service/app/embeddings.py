from functools import lru_cache

from app.config import EMBEDDING_MODEL


@lru_cache(maxsize=1)
def get_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(EMBEDDING_MODEL, device="cpu")


def is_model_loaded() -> bool:
    return get_model.cache_info().currsize > 0


def embed_text(text: str, mode: str = "passage") -> list[float]:
    prepared = prepare_text(text, mode)
    vector = get_model().encode(prepared, normalize_embeddings=True)
    return [float(item) for item in vector.tolist()]


def prepare_text(text: str, mode: str) -> str:
    clean = " ".join((text or "").split())
    if "e5" not in EMBEDDING_MODEL.lower():
        return clean

    if mode == "query":
        return f"query: {clean}"
    return f"passage: {clean}"

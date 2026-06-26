from functools import lru_cache

from app.config import EMBEDDING_MODEL


@lru_cache(maxsize=1)
def get_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(EMBEDDING_MODEL, device="cpu")


def is_model_loaded() -> bool:
    return get_model.cache_info().currsize > 0


def embed_text(text: str) -> list[float]:
    vector = get_model().encode(text, normalize_embeddings=True)
    return [float(item) for item in vector.tolist()]

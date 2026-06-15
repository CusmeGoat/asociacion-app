from sentence_transformers import SentenceTransformer

from app.config import EMBEDDING_MODEL

model = SentenceTransformer(EMBEDDING_MODEL, device="cpu")


def embed_text(text: str) -> list[float]:
    vector = model.encode(text, normalize_embeddings=True)
    return [float(item) for item in vector.tolist()]

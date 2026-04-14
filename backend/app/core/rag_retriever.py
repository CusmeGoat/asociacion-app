from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.document_chunk import DocumentChunk
from app.core.rag_pipeline import embeddings
from typing import List

def retrieve_context(query: str, db: Session, k: int = 4) -> List[dict]:
    # 1. Convertir la consulta en un vector matemático usando E5-Large
    query_vector = embeddings.embed_query(query)
    
    # 2. Buscar en la DB ordenado por Similitud de Coseno vectorial
    res = db.execute(
        select(DocumentChunk)
        .order_by(DocumentChunk.embedding.cosine_distance(query_vector))
        .limit(k)
    ).scalars().all()
    
    return [
        {
            "content": chunk.content, 
            "page_number": chunk.page_number, 
            "document_name": chunk.document_name
        } 
        for chunk in res
    ]

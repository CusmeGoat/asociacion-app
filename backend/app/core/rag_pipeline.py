import fitz
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy.orm import Session
from app.models.document_chunk import DocumentChunk
from app.core.config import EMBEDDING_MODEL, CHUNK_SIZE, CHUNK_OVERLAP

embeddings = HuggingFaceEmbeddings(
    model_name=EMBEDDING_MODEL,
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)

splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", ";", "."],
)


def ingest_pdf(file_path: str, document_name: str, db: Session) -> int:
    doc = fitz.open(file_path)

    chunks_saved = 0
    for page_num, page in enumerate(doc, start=1):
        page_text = page.get_text()
        if not page_text.strip():
            continue

        page_chunks = splitter.split_text(page_text)
        for idx, chunk in enumerate(page_chunks):
            vector = embeddings.embed_query(chunk)

            db_chunk = DocumentChunk(
                document_name=document_name,
                content=chunk,
                embedding=vector,
                page_number=page_num,
                chunk_index=idx,
            )
            db.add(db_chunk)
            chunks_saved += 1

    db.commit()
    doc.close()
    return chunks_saved
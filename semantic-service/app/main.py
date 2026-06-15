from fastapi import FastAPI
from pydantic import BaseModel

from app.document_service import delete_chunks, index_pdf, search_documents

app = FastAPI(title="Semantic Document Service")


class IndexRequest(BaseModel):
    documentId: int
    filename: str
    filePath: str


class SearchRequest(BaseModel):
    query: str
    limit: int = 6


class DeleteChunksRequest(BaseModel):
    filename: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "semantic-service"}


@app.post("/index")
def index_document(req: IndexRequest):
    chunks = index_pdf(req.filePath, req.filename)
    return {
        "status": "ok",
        "document_id": req.documentId,
        "filename": req.filename,
        "chunks": chunks,
    }


@app.post("/search")
def search(req: SearchRequest):
    return {"fuentes": search_documents(req.query, req.limit)}


@app.post("/chunks/delete")
def delete(req: DeleteChunksRequest):
    return {"status": "ok", "deleted": delete_chunks(req.filename)}

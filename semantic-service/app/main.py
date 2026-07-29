from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel

from app.document_service import (
    delete_chunks,
    index_pdf,
    ocr_status,
    render_page_preview,
    search_documents,
)
from app.embeddings import embed_text, is_model_loaded

app = FastAPI(title="Semantic Document Service")


class IndexRequest(BaseModel):
    documentId: str
    filename: str
    filePath: str


class SearchRequest(BaseModel):
    query: str
    limit: int = 6


class PagePreviewRequest(BaseModel):
    filePath: str
    page: int
    dpi: int = 145


class DeleteChunksRequest(BaseModel):
    filename: str


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "semantic-service",
        "model_loaded": is_model_loaded(),
        **ocr_status(),
    }


@app.post("/warmup")
def warmup():
    embed_text("consulta documental de prueba", "query")
    return {
        "status": "ok",
        "service": "semantic-service",
        "model_loaded": is_model_loaded(),
    }


@app.post("/index")
def index_document(req: IndexRequest):
    try:
        chunks = index_pdf(req.filePath, req.filename)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return {
        "status": "ok",
        "document_id": req.documentId,
        "filename": req.filename,
        "chunks": chunks,
    }


@app.post("/search")
def search(req: SearchRequest):
    return {"fuentes": search_documents(req.query, req.limit)}


@app.post("/preview-page")
def preview_page(req: PagePreviewRequest):
    try:
        image = render_page_preview(req.filePath, req.page, req.dpi)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return Response(content=image, media_type="image/png")


@app.post("/chunks/delete")
def delete(req: DeleteChunksRequest):
    return {"status": "ok", "deleted": delete_chunks(req.filename)}

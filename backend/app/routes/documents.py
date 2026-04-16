import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentResponse
from app.core.rag_pipeline import ingest_pdf

router = APIRouter(prefix="/documentos", tags=["documentos"])

@router.get("/", response_model=list[DocumentResponse])
def get_documents(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    
    response = []
    for d in docs:
        uploader_name = f"{d.uploader.nombres} {d.uploader.apellidos}" if d.uploader else "Desconocido"
        response.append(
            DocumentResponse(
                id=d.id,
                filename=d.filename,
                file_path=f"static/documents/{d.filename}",
                uploaded_by_id=d.uploaded_by_id,
                uploader_name=uploader_name,
                created_at=d.created_at
            )
        )
    return response

@router.post("/cargar")
def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF válido")

    documents_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "static", "documents")
    os.makedirs(documents_dir, exist_ok=True)
    
    file_path = os.path.join(documents_dir, file.filename)
    
    # 1. Guardar físicamente
    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar archivo: {str(e)}")

    # 2. Registrar en la base de datos padre
    db_doc = Document(
        filename=file.filename,
        file_path=file_path,
        uploaded_by_id=current_user.id
    )
    db.add(db_doc)
    db.commit()

    # 3. Llamar al RAG para inyectar vectores
    try:
        chunks_indexed = ingest_pdf(file_path, file.filename, db)

        return {
            "status": "ok",
            "document": file.filename,
            "chunks_indexed": chunks_indexed
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante la ingesta vectorial: {str(e)}")

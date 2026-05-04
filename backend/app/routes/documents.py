import os

from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.deps import require_secretario
from app.core.config import MAX_DOCUMENT_SIZE_BYTES
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentResponse
from app.core.rag_pipeline import ingest_pdf

router = APIRouter(prefix="/documentos", tags=["documentos"])


def process_document_background(file_path: str, filename: str, doc_id: int, db_session_factory):
    from app.db.database import SessionLocal

    db = SessionLocal()
    try:
        db_doc = db.query(Document).filter(Document.id == doc_id).first()
        if not db_doc:
            return

        db_doc.status = "en_proceso"
        db.commit()

        chunks_indexed = ingest_pdf(file_path, filename, db)

        db_doc.status = "completado"
        db.commit()
    except ValueError as ve:
        db_doc = db.query(Document).filter(Document.id == doc_id).first()
        if db_doc:
            db_doc.status = "error"
            db_doc.error_message = str(ve)
            db.commit()
    except Exception as e:
        db_doc = db.query(Document).filter(Document.id == doc_id).first()
        if db_doc:
            db_doc.status = "error"
            db_doc.error_message = f"Error durante la indexación: {str(e)}"
            db.commit()
    finally:
        db.close()


@router.get("/", response_model=list[DocumentResponse])
def get_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()

    response = []
    for d in docs:
        uploader_name = (
            f"{d.uploader.nombres} {d.uploader.apellidos}" if d.uploader else "Desconocido"
        )
        response.append(
            DocumentResponse(
                id=d.id,
                filename=d.filename,
                file_path=f"static/documents/{d.filename}",
                uploaded_by_id=d.uploaded_by_id,
                uploader_name=uploader_name,
                status=d.status,
                error_message=d.error_message,
                created_at=d.created_at,
            )
        )
    return response


@router.post("/cargar")
def upload_pdf(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF válido")

    contents = file.file.read()
    file_size = len(contents)
    if file_size > MAX_DOCUMENT_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"El archivo supera el tamaño máximo permitido de {MAX_DOCUMENT_SIZE_BYTES // (1024 * 1024)} MB",
        )
    file.file.seek(0)

    documents_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "..", "static", "documents"
    )
    os.makedirs(documents_dir, exist_ok=True)

    file_path = os.path.join(documents_dir, file.filename)

    try:
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar archivo: {str(e)}")

    db_doc = Document(
        filename=file.filename,
        file_path=file_path,
        uploaded_by_id=current_user.id,
        status="pendiente",
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    from app.db.database import SessionLocal

    background_tasks.add_task(
        process_document_background, file_path, file.filename, db_doc.id, SessionLocal
    )

    return {
        "status": "ok",
        "document_id": db_doc.id,
        "document": file.filename,
        "message": "Documento subido. La indexación se está procesando en segundo plano.",
    }


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    db_doc = db.query(Document).filter(Document.id == document_id).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    # 1) Eliminar el archivo físico del disco
    try:
        if os.path.exists(db_doc.file_path):
            os.remove(db_doc.file_path)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"No se pudo eliminar el archivo: {str(e)}"
        )

    # 2) Eliminar los chunks del índice RAG asociados al documento
    from app.models.document_chunk import DocumentChunk

    db.query(DocumentChunk).filter(
        DocumentChunk.document_name == db_doc.filename
    ).delete(synchronize_session=False)

    # 3) Eliminar el registro del documento
    db.delete(db_doc)
    db.commit()

    return {"status": "ok", "message": f"Documento '{db_doc.filename}' eliminado correctamente."}
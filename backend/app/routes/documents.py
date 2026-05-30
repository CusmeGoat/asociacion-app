from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.application.services.document_service import DocumentApplicationService
from app.core.deps import require_secretario
from app.db.database import SessionLocal, get_db
from app.infrastructure.repositories import SqlAlchemyDocumentRepository
from app.infrastructure.services import LocalFileStorage, SqlAlchemyRagIndexer
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentResponse

router = APIRouter(prefix="/documentos", tags=["documentos"])


def build_document_service(
    db: Session,
    include_rag_indexer: bool = False,
) -> DocumentApplicationService:
    return DocumentApplicationService(
        documents=SqlAlchemyDocumentRepository(db),
        file_storage=LocalFileStorage(),
        rag_indexer=SqlAlchemyRagIndexer(db) if include_rag_indexer else None,
    )


def process_document_background(file_path: str, filename: str, doc_id: int):
    db = SessionLocal()
    try:
        service = build_document_service(db, include_rag_indexer=True)
        service.process_document(doc_id, file_path, filename)
    finally:
        db.close()


def document_to_response(document: Document) -> DocumentResponse:
    uploader_name = (
        f"{document.uploader.nombres} {document.uploader.apellidos}"
        if document.uploader
        else "Desconocido"
    )
    return DocumentResponse(
        id=document.id,
        filename=document.filename,
        file_path=f"static/documents/{document.filename}",
        uploaded_by_id=document.uploaded_by_id,
        uploader_name=uploader_name,
        status=document.status,
        error_message=document.error_message,
        created_at=document.created_at,
    )


@router.get("/", response_model=list[DocumentResponse])
def get_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    docs = build_document_service(db).list_documents()
    return [document_to_response(document) for document in docs]


@router.post("/cargar")
def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    contents = file.file.read()
    file.file.seek(0)

    document = build_document_service(db).upload_pdf(
        filename=file.filename or "",
        contents=contents,
        uploaded_by_id=current_user.id,
    )

    background_tasks.add_task(
        process_document_background,
        document.file_path,
        document.filename,
        document.id,
    )

    return {
        "status": "ok",
        "document_id": document.id,
        "document": document.filename,
        "message": "Documento subido. La indexacion se esta procesando en segundo plano.",
    }


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_secretario),
):
    document = build_document_service(db).delete_document(document_id)
    return {
        "status": "ok",
        "message": f"Documento '{document.filename}' eliminado correctamente.",
    }

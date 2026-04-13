import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.core.rag_pipeline import ingest_pdf

router = APIRouter(prefix="/documentos", tags=["documentos"])

@router.post("/cargar")
def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF válido")

    temp_file_path = f"temp_{file.filename}"
    try:
        with open(temp_file_path, "wb") as f:
            f.write(file.file.read())

        chunks_indexed = ingest_pdf(temp_file_path, file.filename, db)

        return {
            "status": "ok",
            "document": file.filename,
            "chunks_indexed": chunks_indexed
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante la ingesta: {str(e)}")
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

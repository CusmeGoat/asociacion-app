import os
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.application.exceptions import ApplicationError
from app.core.config import GROQ_API_KEY, LLM_PROVIDER, OLLAMA_BASE_URL
from app.core.email_service import send_reset_password_email


class SmtpEmailService:
    def send_reset_password_email(
        self,
        to_email: str,
        nombre: str,
        reset_token: str,
        expires_hours: int,
    ) -> None:
        send_reset_password_email(to_email, nombre, reset_token, expires_hours)


class LocalFileStorage:
    ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "application/octet-stream"]
    ALLOWED_EXTENSIONS = [".jpeg", ".jpg", ".png"]
    MAX_IMAGE_SIZE = 10 * 1024 * 1024

    def __init__(self):
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        self.static_dir = os.path.join(backend_dir, "static")
        self.images_dir = os.path.join(self.static_dir, "images")
        self.documents_dir = os.path.join(self.static_dir, "documents")
        os.makedirs(self.images_dir, exist_ok=True)
        os.makedirs(self.documents_dir, exist_ok=True)

    def save_document(self, filename: str, contents: bytes) -> str:
        os.makedirs(self.documents_dir, exist_ok=True)
        file_path = os.path.join(self.documents_dir, filename)

        with open(file_path, "wb") as file:
            file.write(contents)

        return file_path

    def delete_file(self, file_path: str) -> None:
        if os.path.exists(file_path):
            os.remove(file_path)

    async def save_announcement_image(
        self,
        file: Any,
        previous_image_url: str | None = None,
    ) -> str:
        file_ext = os.path.splitext((file.filename or "").lower())[1]
        content_type_ok = file.content_type in self.ALLOWED_CONTENT_TYPES
        extension_ok = file_ext in self.ALLOWED_EXTENSIONS

        if not content_type_ok and not extension_ok:
            raise ApplicationError(status_code=415, detail="Solo se permiten archivos PNG o JPG.")

        contents = await file.read()
        if len(contents) > self.MAX_IMAGE_SIZE:
            raise ApplicationError(status_code=413, detail="La imagen no debe superar los 10MB.")

        await file.seek(0)
        self.delete_announcement_image(previous_image_url)

        new_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(self.images_dir, new_filename)

        with open(file_path, "wb") as image_file:
            image_file.write(contents)

        return f"/static/images/{new_filename}"

    def delete_announcement_image(self, image_url: str | None) -> None:
        if not image_url:
            return

        old_filename = image_url.split("/")[-1]
        old_path = os.path.join(self.images_dir, old_filename)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass


class SqlAlchemyRagIndexer:
    def __init__(self, db: Session):
        self.db = db

    def ingest_pdf(self, file_path: str, document_name: str) -> int:
        from app.core.rag_pipeline import ingest_pdf

        return ingest_pdf(file_path, document_name, self.db)


class SqlAlchemyRagRetriever:
    def __init__(self, db: Session):
        self.db = db

    def retrieve_context(self, query: str, k: int = 4) -> list[dict[str, Any]]:
        from app.core.rag_retriever import retrieve_context

        return retrieve_context(query, self.db, k)


class LangChainLlmProvider:
    def _get_llm(self):
        if LLM_PROVIDER == "groq":
            from langchain_groq import ChatGroq

            if not GROQ_API_KEY or GROQ_API_KEY == "pon_tu_clave_aqui":
                raise ValueError("Falta configurar tu GROQ_API_KEY real en el archivo .env")
            return ChatGroq(model="llama-3.1-8b-instant", api_key=GROQ_API_KEY)

        if LLM_PROVIDER == "ollama":
            from langchain_ollama import ChatOllama

            return ChatOllama(model="qwen2.5:7b", base_url=OLLAMA_BASE_URL)

        raise ValueError("Proveedor LLM_PROVIDER erroneo en el archivo .env")

    def invoke(self, system_prompt: str, human_prompt: str) -> str:
        from langchain_core.messages import HumanMessage, SystemMessage

        response = self._get_llm().invoke(
            [SystemMessage(content=system_prompt), HumanMessage(content=human_prompt)]
        )
        return response.content

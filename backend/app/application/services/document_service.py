from app.application.exceptions import ApplicationError
from app.application.ports.repositories import DocumentRepositoryPort
from app.application.ports.services import FileStoragePort, RagIndexerPort
from app.core.config import MAX_DOCUMENT_SIZE_BYTES


class DocumentApplicationService:
    def __init__(
        self,
        documents: DocumentRepositoryPort,
        file_storage: FileStoragePort,
        rag_indexer: RagIndexerPort | None = None,
    ):
        self.documents = documents
        self.file_storage = file_storage
        self.rag_indexer = rag_indexer

    def list_documents(self):
        return self.documents.list_documents()

    def upload_pdf(self, filename: str, contents: bytes, uploaded_by_id: int):
        if not filename.lower().endswith(".pdf"):
            raise ApplicationError(status_code=400, detail="El archivo debe ser un PDF valido")

        if len(contents) > MAX_DOCUMENT_SIZE_BYTES:
            max_mb = MAX_DOCUMENT_SIZE_BYTES // (1024 * 1024)
            raise ApplicationError(
                status_code=400,
                detail=f"El archivo supera el tamano maximo permitido de {max_mb} MB",
            )

        file_path = self.file_storage.save_document(filename, contents)
        return self.documents.create(filename, file_path, uploaded_by_id)

    def process_document(self, document_id: int, file_path: str, filename: str):
        if self.rag_indexer is None:
            raise ApplicationError(status_code=500, detail="Indexador RAG no configurado")

        document = self.documents.find_by_id(document_id)
        if not document:
            return

        try:
            document.status = "en_proceso"
            self.documents.save(document)

            self.rag_indexer.ingest_pdf(file_path, filename)

            document.status = "completado"
            document.error_message = None
            self.documents.save(document)
        except ValueError as exc:
            document.status = "error"
            document.error_message = str(exc)
            self.documents.save(document)
        except Exception as exc:
            document.status = "error"
            document.error_message = f"Error durante la indexacion: {str(exc)}"
            self.documents.save(document)

    def delete_document(self, document_id: int):
        document = self.documents.find_by_id(document_id)
        if not document:
            raise ApplicationError(status_code=404, detail="Documento no encontrado")

        try:
            self.file_storage.delete_file(document.file_path)
        except Exception as exc:
            raise ApplicationError(
                status_code=500,
                detail=f"No se pudo eliminar el archivo: {str(exc)}",
            )

        self.documents.delete_chunks_by_document_name(document.filename)
        self.documents.delete(document)
        return document

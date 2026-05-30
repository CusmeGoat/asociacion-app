from typing import Any, Protocol


class EmailServicePort(Protocol):
    def send_reset_password_email(
        self,
        to_email: str,
        nombre: str,
        reset_token: str,
        expires_hours: int,
    ) -> None: ...


class FileStoragePort(Protocol):
    def save_document(self, filename: str, contents: bytes) -> str: ...
    def delete_file(self, file_path: str) -> None: ...
    async def save_announcement_image(self, file: Any, previous_image_url: str | None = None) -> str: ...
    def delete_announcement_image(self, image_url: str | None) -> None: ...


class RagIndexerPort(Protocol):
    def ingest_pdf(self, file_path: str, document_name: str) -> int: ...


class RagRetrieverPort(Protocol):
    def retrieve_context(self, query: str, k: int = 4) -> list[dict[str, Any]]: ...


class LlmProviderPort(Protocol):
    def invoke(self, system_prompt: str, human_prompt: str) -> str: ...

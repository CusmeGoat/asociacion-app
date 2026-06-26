import fitz

from app.database import get_connection
from app.embeddings import embed_text
from app.text_splitter import split_text
import os


def vector_literal(vector: list[float]) -> str:
    return "[" + ",".join(str(item) for item in vector) + "]"


def index_pdf(file_path: str, filename: str) -> int:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"El archivo no existe en el servidor: {file_path}")
    if os.path.getsize(file_path) == 0:
        raise ValueError(
            f"El archivo '{filename}' esta vacio (0 bytes). "
            "Verifica que el PDF se haya subido correctamente desde el dispositivo."
        )
    document = fitz.open(file_path)
    saved = 0

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM document_chunks WHERE document_name = %s", (filename,))

            for page_number, page in enumerate(document, start=1):
                page_text = page.get_text()
                for chunk_index, chunk in enumerate(split_text(page_text)):
                    vector = vector_literal(embed_text(chunk))
                    cur.execute(
                        """
                        INSERT INTO document_chunks
                          (document_name, content, embedding, page_number, chunk_index)
                        VALUES (%s, %s, %s::vector, %s, %s)
                        """,
                        (filename, chunk, vector, page_number, chunk_index),
                    )
                    saved += 1

        conn.commit()

    document.close()
    return saved


def search_documents(query: str, limit: int) -> list[dict]:
    vector = vector_literal(embed_text(query))

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  dc.content,
                  dc.page_number,
                  dc.document_name,
                  dc.embedding <=> %s::vector AS distance
                FROM document_chunks dc
                INNER JOIN documents d ON d.filename = dc.document_name
                WHERE d.status = 'completado'
                ORDER BY dc.embedding <=> %s::vector
                LIMIT %s
                """,
                (vector, vector, limit),
            )
            rows = cur.fetchall()

    return [
        {
            "content": row["content"],
            "page_number": row["page_number"],
            "document_name": row["document_name"],
            "distance": float(row["distance"]),
        }
        for row in rows
    ]


def delete_chunks(filename: str) -> int:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM document_chunks WHERE document_name = %s", (filename,))
            deleted = cur.rowcount
        conn.commit()
    return deleted

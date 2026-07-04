import argparse
import os
import sys
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_ROOT.parent
sys.path.insert(0, str(SERVICE_ROOT))

from app.database import get_connection  # noqa: E402
from app.document_service import index_pdf  # noqa: E402


def resolve_document_path(filename: str, stored_path: str) -> Path:
    candidates = []
    if stored_path:
        stored = Path(stored_path)
        if stored.is_absolute():
            candidates.append(stored)
        candidates.extend(
            [
                REPO_ROOT / stored_path,
                REPO_ROOT / "backend" / stored_path,
            ]
        )

    candidates.extend(
        [
            REPO_ROOT / "backend" / "static" / "documents" / filename,
            REPO_ROOT / "static" / "documents" / filename,
        ]
    )

    for candidate in candidates:
        absolute = candidate.resolve()
        if absolute.exists():
            return absolute

    return candidates[0].resolve() if candidates else Path(filename).resolve()


def load_documents(name_filter: str | None, limit: int | None) -> list[dict]:
    sql = """
        SELECT
            id,
            nombre_archivo AS filename,
            ruta_archivo AS file_path,
            estado AS status
        FROM documentos
        ORDER BY creado_en DESC
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            documents = list(cur.fetchall())

    if name_filter:
        normalized_filter = name_filter.lower()
        documents = [
            document
            for document in documents
            if normalized_filter in document["filename"].lower()
        ]

    if limit:
        documents = documents[:limit]

    return documents


def set_status(document_id: int, status: str, error_message: str | None = None) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE documentos
                SET estado = %s, mensaje_error = %s
                WHERE id = %s
                """,
                (status, error_message, document_id),
            )
        conn.commit()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Reindexa documentos PDF usando la limpieza OCR actual."
    )
    parser.add_argument("--only", help="Texto que debe aparecer en el nombre del archivo.")
    parser.add_argument("--limit", type=int, help="Cantidad maxima de documentos a procesar.")
    parser.add_argument("--dry-run", action="store_true", help="Solo muestra que procesaria.")
    args = parser.parse_args()

    documents = load_documents(args.only, args.limit)
    if not documents:
        print("No hay documentos para reindexar.")
        return 0

    for document in documents:
        file_path = resolve_document_path(document["filename"], document["file_path"])
        print(f"[{document['id']}] {document['filename']} -> {file_path}")

        if args.dry_run:
            continue

        if not os.path.exists(file_path):
            message = f"No se encontro el archivo fisico: {file_path}"
            set_status(document["id"], "error", message)
            print(f"  ERROR: {message}")
            continue

        try:
            set_status(document["id"], "en_proceso", None)
            chunks = index_pdf(str(file_path), document["filename"])
            set_status(document["id"], "completado", None)
            print(f"  OK: {chunks} chunks generados.")
        except Exception as exc:
            message = str(exc)
            set_status(document["id"], "error", message)
            print(f"  ERROR: {message}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

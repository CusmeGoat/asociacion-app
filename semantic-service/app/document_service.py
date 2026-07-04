import io
import os
import re
import unicodedata

# pyrefly: ignore [missing-import]
import fitz

from app.config import (
    OCR_DPI,
    OCR_ENABLED,
    OCR_LANGUAGE,
    OCR_MIN_PAGE_CHARS,
    OCR_TESSERACT_CONFIG,
    OCR_TESSDATA_DIR,
    OCR_TESSERACT_CMD,
    SEARCH_FETCH_MULTIPLIER,
    SEARCH_MAX_DISTANCE,
)
from app.database import get_connection
from app.embeddings import embed_text
from app.text_splitter import split_text

try:
    # pyrefly: ignore [missing-import]
    import pytesseract
    # pyrefly: ignore [missing-import]
    from PIL import Image
except ImportError:
    pytesseract = None
    Image = None


def vector_literal(vector: list[float]) -> str:
    return "[" + ",".join(str(item) for item in vector) + "]"


def _normalize_text(text: str) -> str:
    return " ".join(text.split())


def _clean_extracted_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "")
    replacements = {
        "\u00ad": "",
        "\ufeff": "",
        "\u2010": "-",
        "\u2011": "-",
        "\u2012": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2026": "...",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    text = "".join(
        char
        for char in text
        if char in "\n\t" or not unicodedata.category(char).startswith("C")
    )
    text = re.sub(r"([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])-+\s*\n\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])", r"\1\2", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    cleaned_lines: list[str] = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if _line_has_useful_text(line):
            cleaned_lines.append(line)

    text = " ".join(cleaned_lines)
    text = re.sub(r"([,.;:!?]){2,}", r"\1", text)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r"([({\[])\s+", r"\1", text)
    text = re.sub(r"\s+([)}\]])", r"\1", text)
    return re.sub(r"\s{2,}", " ", text).strip()


def _line_has_useful_text(text: str) -> bool:
    letters = sum(1 for char in text if char.isalpha())
    digits = sum(1 for char in text if char.isdigit())
    visible = sum(1 for char in text if not char.isspace())
    if visible == 0:
        return False
    if letters + digits < 4:
        return False
    return (letters + digits) / visible >= 0.35


def _text_quality_score(text: str) -> float:
    visible = [char for char in text if not char.isspace()]
    if not visible:
        return 0

    letters_digits = sum(1 for char in visible if char.isalpha() or char.isdigit())
    words = re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}", text)
    if not words:
        return 0

    average_word_length = sum(len(word) for word in words) / len(words)
    base = letters_digits / len(visible)
    word_density = min(len(words) / 20, 1)
    long_word_penalty = 0.12 if average_word_length > 12 else 0
    return max(0, min(1, (base * 0.75) + (word_density * 0.25) - long_word_penalty))


def _is_useful_text(text: str) -> bool:
    return len(text) >= 40 and _text_quality_score(text) >= 0.45


def ocr_available() -> bool:
    if not OCR_ENABLED or pytesseract is None or Image is None:
        return False

    _configure_tesseract()

    try:
        pytesseract.get_tesseract_version()
        languages = pytesseract.get_languages(config="")
        return OCR_LANGUAGE in languages
    except Exception:
        return False


def ocr_status() -> dict:
    return {
        "ocr_enabled": OCR_ENABLED,
        "ocr_available": ocr_available(),
        "ocr_language": OCR_LANGUAGE,
        "ocr_tessdata_dir": OCR_TESSDATA_DIR,
    }


def _page_has_images(page: fitz.Page) -> bool:
    return bool(page.get_images(full=True))


def _configure_tesseract() -> None:
    if OCR_TESSERACT_CMD and pytesseract is not None:
        pytesseract.pytesseract.tesseract_cmd = OCR_TESSERACT_CMD
    os.environ["TESSDATA_PREFIX"] = OCR_TESSDATA_DIR


def _extract_text_with_ocr(page: fitz.Page, page_number: int, filename: str) -> str:
    if not OCR_ENABLED:
        raise ValueError(
            f"La pagina {page_number} del documento '{filename}' parece escaneada, "
            "pero OCR esta desactivado en semantic-service."
        )
    if pytesseract is None or Image is None:
        raise ValueError(
            "OCR no esta disponible porque faltan las dependencias pytesseract y Pillow. "
            "Instalalas en el entorno Python del semantic-service."
        )
    if not ocr_available():
        raise ValueError(
            "OCR no esta disponible. Instala Tesseract OCR con idioma espanol y verifica "
            f"OCR_TESSERACT_CMD={OCR_TESSERACT_CMD} y OCR_TESSDATA_DIR={OCR_TESSDATA_DIR}."
        )

    matrix = fitz.Matrix(OCR_DPI / 72, OCR_DPI / 72)
    pixmap = page.get_pixmap(matrix=matrix, alpha=False)
    image = Image.open(io.BytesIO(pixmap.tobytes("png")))
    _configure_tesseract()
    return pytesseract.image_to_string(
        image,
        lang=OCR_LANGUAGE,
        config=OCR_TESSERACT_CONFIG,
    )


def _extract_page_text(page: fitz.Page, page_number: int, filename: str) -> str:
    native_text = _clean_extracted_text(page.get_text("text"))
    if len(_normalize_text(native_text)) >= OCR_MIN_PAGE_CHARS:
        return native_text

    if not _page_has_images(page):
        return native_text

    ocr_text = _clean_extracted_text(_extract_text_with_ocr(page, page_number, filename))
    if native_text.strip() and ocr_text.strip():
        return f"{native_text}\n{ocr_text}"
    return ocr_text or native_text


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

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM fragmentos_documento WHERE nombre_documento = %s", (filename,))

                for page_number, page in enumerate(document, start=1):
                    page_text = _extract_page_text(page, page_number, filename)
                    for chunk_index, chunk in enumerate(split_text(page_text)):
                        chunk = _clean_extracted_text(chunk)
                        if not _is_useful_text(chunk):
                            continue
                        vector = vector_literal(embed_text(chunk))
                        cur.execute(
                            """
                            INSERT INTO fragmentos_documento
                              (nombre_documento, contenido, vector_embedding, numero_pagina, indice_fragmento)
                            VALUES (%s, %s, %s::vector, %s, %s)
                            """,
                            (filename, chunk, vector, page_number, chunk_index),
                        )
                        saved += 1

            conn.commit()

        if saved == 0:
            raise ValueError(
                f"El documento '{filename}' no contiene texto legible. "
                "Si es un PDF escaneado, verifica que la imagen sea clara y que OCR este disponible."
            )

        return saved
    finally:
        document.close()


def search_documents(query: str, limit: int) -> list[dict]:
    vector = vector_literal(embed_text(query))
    fetch_limit = max(limit, min(limit * SEARCH_FETCH_MULTIPLIER, 40))

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  dc.contenido AS content,
                  dc.numero_pagina AS page_number,
                  dc.nombre_documento AS document_name,
                  dc.indice_fragmento AS chunk_index,
                  dc.vector_embedding <=> %s::vector AS distance
                FROM fragmentos_documento dc
                INNER JOIN documentos d ON d.nombre_archivo = dc.nombre_documento
                WHERE d.estado = 'completado'
                ORDER BY dc.vector_embedding <=> %s::vector
                LIMIT %s
                """,
                (vector, vector, fetch_limit),
            )
            rows = cur.fetchall()

    results: list[dict] = []
    seen_pages: set[str] = set()
    seen_content: set[str] = set()

    for row in rows:
        distance = float(row["distance"])
        if SEARCH_MAX_DISTANCE > 0 and distance > SEARCH_MAX_DISTANCE:
            continue

        content = _clean_extracted_text(row["content"])
        if not _is_useful_text(content):
            continue

        page_key = f"{row['document_name']}|{row['page_number']}"
        if page_key in seen_pages:
            continue

        content_key = content[:180].lower()
        if content_key in seen_content:
            continue

        seen_pages.add(page_key)
        seen_content.add(content_key)
        results.append(
            {
                "content": content,
                "page_number": row["page_number"],
                "document_name": row["document_name"],
                "chunk_index": row["chunk_index"],
                "distance": distance,
                "quality": _text_quality_score(content),
            }
        )

        if len(results) >= limit:
            break

    return results


def delete_chunks(filename: str) -> int:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM fragmentos_documento WHERE nombre_documento = %s", (filename,))
            deleted = cur.rowcount
        conn.commit()
    return deleted

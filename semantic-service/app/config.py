import os

from dotenv import load_dotenv

load_dotenv()

SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def service_path(value: str) -> str:
    if os.path.isabs(value):
        return value
    return os.path.abspath(os.path.join(SERVICE_ROOT, value))

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/asociacion",
)
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-large")
VECTOR_DIMENSION = int(os.getenv("VECTOR_DIMENSION", "1024"))
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))
OCR_ENABLED = os.getenv("OCR_ENABLED", "true").lower() in {"1", "true", "yes", "on"}
OCR_LANGUAGE = os.getenv("OCR_LANGUAGE", "spa")
OCR_DPI = int(os.getenv("OCR_DPI", "220"))
OCR_MIN_PAGE_CHARS = int(os.getenv("OCR_MIN_PAGE_CHARS", "30"))
OCR_TESSERACT_CONFIG = os.getenv("OCR_TESSERACT_CONFIG", "--oem 1 --psm 6")
OCR_TESSERACT_CMD = os.getenv(
    "OCR_TESSERACT_CMD",
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
)
OCR_TESSDATA_DIR = os.getenv(
    "OCR_TESSDATA_DIR",
    ".tessdata",
)
OCR_TESSDATA_DIR = service_path(OCR_TESSDATA_DIR)
SEARCH_MAX_DISTANCE = float(os.getenv("SEARCH_MAX_DISTANCE", "0.85"))
SEARCH_FETCH_MULTIPLIER = int(os.getenv("SEARCH_FETCH_MULTIPLIER", "4"))

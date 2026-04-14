import os

# Modelo de embeddings open source
EMBEDDING_MODEL = "intfloat/multilingual-e5-large"
VECTOR_DIMENSION = 1024

# Parámetros de chunking
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
MAX_PAGES_PER_PDF = 80

# Configuraciones del Cerebro LLM (Fase 4)
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

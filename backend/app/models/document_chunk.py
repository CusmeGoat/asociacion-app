from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.db.database import Base
from app.core.config import VECTOR_DIMENSION

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_name = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(VECTOR_DIMENSION), nullable=False)
    page_number = Column(Integer, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

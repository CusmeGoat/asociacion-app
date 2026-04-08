from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    image_url = Column(String(300), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    published_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    publisher = relationship("User", back_populates="announcements")
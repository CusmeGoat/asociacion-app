from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    category: str


# ── NUEVO ─────────────────────────────────────────────────────────────────────
# Todos los campos son opcionales: solo se actualizan los que se envíen.

class AnnouncementUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None


# ─────────────────────────────────────────────────────────────────────────────

class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    category: str
    is_active: bool
    created_at: datetime | None = None
    published_by: int
    publisher_name: str

    model_config = ConfigDict(from_attributes=True)
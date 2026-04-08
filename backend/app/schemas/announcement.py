from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    category: str


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    category: str
    is_active: bool
    image_url: str | None = None
    created_at: datetime | None = None
    published_by: int
    publisher_name: str

    model_config = ConfigDict(from_attributes=True)
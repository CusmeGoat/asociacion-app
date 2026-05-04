from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    category: str
    otros_subtype: str | None = None


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None
    otros_subtype: str | None = None


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    category: str
    otros_subtype: str | None = None
    is_active: bool
    image_url: str | None = None
    created_at: datetime | None = None
    published_by: int
    publisher_name: str

    model_config = ConfigDict(from_attributes=True)


class AnnouncementFilter(BaseModel):
    categories: list[str] | None = None
    search: str | None = None
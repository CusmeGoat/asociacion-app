from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.application.services.announcement_service import AnnouncementApplicationService
from app.core.deps import get_current_user
from app.db.database import get_db
from app.infrastructure.repositories import (
    SqlAlchemyAnnouncementRepository,
    SqlAlchemyNotificationRepository,
)
from app.infrastructure.services import LocalFileStorage
from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementResponse, AnnouncementUpdate

router = APIRouter(prefix="/announcements", tags=["announcements"])


def build_announcement_service(db: Session) -> AnnouncementApplicationService:
    return AnnouncementApplicationService(
        announcements=SqlAlchemyAnnouncementRepository(db),
        notifications=SqlAlchemyNotificationRepository(db),
        file_storage=LocalFileStorage(),
    )


def announcement_to_response(announcement: Announcement) -> AnnouncementResponse:
    return AnnouncementResponse(
        id=announcement.id,
        title=announcement.title,
        content=announcement.content,
        category=announcement.category,
        otros_subtype=announcement.otros_subtype,
        is_active=announcement.is_active,
        image_url=announcement.image_url,
        created_at=announcement.created_at,
        published_by=announcement.published_by,
        publisher_name=f"{announcement.publisher.nombres} {announcement.publisher.apellidos}",
    )


@router.post("/", response_model=AnnouncementResponse)
def create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcement = build_announcement_service(db).create_announcement(
        data.model_dump(),
        current_user_id=current_user.id,
    )
    return announcement_to_response(announcement)


@router.get("/", response_model=list[AnnouncementResponse])
def list_announcements(
    categories: str | None = None,
    search: str | None = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcements = build_announcement_service(db).list_announcements(
        categories=categories,
        search=search,
        include_inactive=include_inactive,
        current_user=current_user,
    )
    return [announcement_to_response(item) for item in announcements]


@router.put("/{id}", response_model=AnnouncementResponse)
def update_announcement(
    id: int,
    data: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcement = build_announcement_service(db).update_announcement(id, data.model_dump())
    return announcement_to_response(announcement)


@router.patch("/{id}/deactivate", response_model=AnnouncementResponse)
def deactivate_announcement(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcement = build_announcement_service(db).deactivate_announcement(id)
    return announcement_to_response(announcement)


@router.patch("/{id}/activate", response_model=AnnouncementResponse)
def activate_announcement(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcement = build_announcement_service(db).activate_announcement(id)
    return announcement_to_response(announcement)


@router.patch("/{id}/image", response_model=AnnouncementResponse)
async def upload_image(
    id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcement = await build_announcement_service(db).upload_image(id, file)
    return announcement_to_response(announcement)


@router.delete("/{id}/image", response_model=AnnouncementResponse)
def delete_image(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcement = build_announcement_service(db).delete_image(id)
    return announcement_to_response(announcement)

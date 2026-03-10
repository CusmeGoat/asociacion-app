from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.db.database import get_db
from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementResponse

router = APIRouter(prefix="/announcements", tags=["announcements"])


def announcement_to_response(announcement: Announcement) -> AnnouncementResponse:
    return AnnouncementResponse(
        id=announcement.id,
        title=announcement.title,
        content=announcement.content,
        category=announcement.category,
        is_active=announcement.is_active,
        created_at=announcement.created_at,
        published_by=announcement.published_by,
        publisher_name=f"{announcement.publisher.nombres} {announcement.publisher.apellidos}",
    )


@router.post("/", response_model=AnnouncementResponse)
def create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    announcement = Announcement(
        title=data.title,
        content=data.content,
        category=data.category,
        is_active=True,
        published_by=current_user.id,
    )

    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    return announcement_to_response(announcement)


@router.get("/", response_model=list[AnnouncementResponse])
def list_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcements = (
        db.query(Announcement)
        .filter(Announcement.is_active == True)
        .order_by(Announcement.created_at.desc())
        .all()
    )

    return [announcement_to_response(item) for item in announcements]
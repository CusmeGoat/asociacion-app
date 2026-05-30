from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.application.services.notification_service import NotificationApplicationService
from app.core.deps import get_current_user
from app.db.database import get_db
from app.infrastructure.repositories import SqlAlchemyNotificationRepository
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse, UnreadCountResponse

router = APIRouter(prefix="/notificaciones", tags=["notificaciones"])


def build_notification_service(db: Session) -> NotificationApplicationService:
    return NotificationApplicationService(
        notifications=SqlAlchemyNotificationRepository(db),
    )


def notification_to_response(n: Notification) -> NotificationResponse:
    return NotificationResponse(
        id=n.id,
        user_id=n.user_id,
        title=n.title,
        message=n.message,
        announcement_type=n.announcement_type,
        announcement_id=n.announcement_id,
        is_read=n.is_read,
        created_at=n.created_at,
    )


@router.get("/", response_model=list[NotificationResponse])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifications = build_notification_service(db).list_notifications(current_user.id)
    return [notification_to_response(n) for n in notifications]


@router.get("/no-leidas", response_model=list[NotificationResponse])
def list_unread_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifications = build_notification_service(db).list_unread_notifications(current_user.id)
    return [notification_to_response(n) for n in notifications]


@router.get("/no-leidas/count", response_model=UnreadCountResponse)
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = build_notification_service(db).unread_count(current_user.id)
    return UnreadCountResponse(count=count)


@router.patch("/{id}/leer", response_model=NotificationResponse)
def mark_as_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = build_notification_service(db).mark_as_read(id, current_user.id)
    return notification_to_response(notification)


@router.patch("/leer-todas")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return build_notification_service(db).mark_all_as_read(current_user.id)

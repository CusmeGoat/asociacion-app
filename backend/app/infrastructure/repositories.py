from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.announcement import Announcement
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.notification import Notification
from app.models.password_reset import PasswordResetToken
from app.models.role import Role
from app.models.user import User


class SqlAlchemyUserRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, user_id: int) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def find_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def find_by_cedula(self, cedula: str) -> User | None:
        return self.db.query(User).filter(User.cedula == cedula).first()

    def find_role_by_name(self, name: str) -> Role | None:
        return self.db.query(Role).filter(Role.name == name).first()

    def list_users(self, search: str | None = None, is_active: bool | None = None) -> list[User]:
        query = self.db.query(User)

        if search:
            query = query.filter(
                or_(
                    User.nombres.ilike(f"%{search}%"),
                    User.apellidos.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%"),
                    User.cedula.ilike(f"%{search}%"),
                )
            )

        if is_active is not None:
            query = query.filter(User.is_active == is_active)

        return query.all()

    def create_user(self, data: dict[str, Any], role: Role, password_hash: str) -> User:
        user = User(
            nombres=data["nombres"],
            apellidos=data["apellidos"],
            cedula=data["cedula"],
            email=data["email"],
            password_hash=password_hash,
            is_active=True,
        )
        user.roles.append(role)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def save(self, user: User) -> User:
        self.db.commit()
        self.db.refresh(user)
        return user


class SqlAlchemyPasswordResetRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int, token: str, expires_at: Any) -> PasswordResetToken:
        reset_entry = PasswordResetToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
        )
        self.db.add(reset_entry)
        self.db.commit()
        self.db.refresh(reset_entry)
        return reset_entry

    def find_by_token(self, token: str) -> PasswordResetToken | None:
        return (
            self.db.query(PasswordResetToken)
            .filter(PasswordResetToken.token == token)
            .first()
        )

    def save(self, reset_entry: PasswordResetToken) -> PasswordResetToken:
        self.db.commit()
        self.db.refresh(reset_entry)
        return reset_entry


class SqlAlchemyAnnouncementRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, data: dict[str, Any], published_by: int) -> Announcement:
        announcement = Announcement(
            title=data["title"],
            content=data["content"],
            category=data["category"],
            otros_subtype=data.get("otros_subtype"),
            is_active=True,
            published_by=published_by,
        )
        self.db.add(announcement)
        self.db.commit()
        self.db.refresh(announcement)
        return announcement

    def find_by_id(self, announcement_id: int) -> Announcement | None:
        return self.db.query(Announcement).filter(Announcement.id == announcement_id).first()

    def list_announcements(
        self,
        categories: list[str] | None = None,
        search: str | None = None,
        include_inactive: bool = False,
    ) -> list[Announcement]:
        query = self.db.query(Announcement)

        if not include_inactive:
            query = query.filter(Announcement.is_active == True)

        if categories:
            query = query.filter(Announcement.category.in_(categories))

        if search:
            query = query.filter(
                or_(
                    Announcement.title.ilike(f"%{search}%"),
                    Announcement.content.ilike(f"%{search}%"),
                )
            )

        return query.order_by(Announcement.created_at.desc()).all()

    def save(self, announcement: Announcement) -> Announcement:
        self.db.commit()
        self.db.refresh(announcement)
        return announcement


class SqlAlchemyNotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_for_active_users(self, announcement: Announcement, announcement_type: str) -> None:
        users = self.db.query(User).filter(User.is_active == True).all()

        for user in users:
            notification = Notification(
                user_id=user.id,
                title="Nuevo anuncio publicado",
                message=(
                    f"Se ha publicado un nuevo anuncio de tipo {announcement_type}: "
                    f"{announcement.title}"
                ),
                announcement_type=announcement_type,
                announcement_id=announcement.id,
                is_read=False,
            )
            self.db.add(notification)

        self.db.commit()

    def list_for_user(self, user_id: int, unread_only: bool = False) -> list[Notification]:
        query = self.db.query(Notification).filter(Notification.user_id == user_id)

        if unread_only:
            query = query.filter(Notification.is_read == False)

        return query.order_by(Notification.created_at.desc()).all()

    def count_unread(self, user_id: int) -> int:
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == False)
            .count()
        )

    def find_for_user(self, notification_id: int, user_id: int) -> Notification | None:
        return (
            self.db.query(Notification)
            .filter(Notification.id == notification_id, Notification.user_id == user_id)
            .first()
        )

    def save(self, notification: Notification) -> Notification:
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def mark_all_as_read(self, user_id: int) -> None:
        self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
        ).update({"is_read": True})
        self.db.commit()


class SqlAlchemyDocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_documents(self) -> list[Document]:
        return self.db.query(Document).order_by(Document.created_at.desc()).all()

    def create(self, filename: str, file_path: str, uploaded_by_id: int) -> Document:
        document = Document(
            filename=filename,
            file_path=file_path,
            uploaded_by_id=uploaded_by_id,
            status="pendiente",
        )
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document

    def find_by_id(self, document_id: int) -> Document | None:
        return self.db.query(Document).filter(Document.id == document_id).first()

    def save(self, document: Document) -> Document:
        self.db.commit()
        self.db.refresh(document)
        return document

    def delete(self, document: Document) -> None:
        self.db.delete(document)
        self.db.commit()

    def delete_chunks_by_document_name(self, document_name: str) -> None:
        self.db.query(DocumentChunk).filter(
            DocumentChunk.document_name == document_name
        ).delete(synchronize_session=False)
        self.db.commit()

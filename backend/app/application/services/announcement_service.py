from app.application.exceptions import ApplicationError
from app.application.ports.repositories import (
    AnnouncementRepositoryPort,
    NotificationRepositoryPort,
)
from app.application.ports.services import FileStoragePort
from app.domain.announcements import ALL_CATEGORIES, get_announcement_type_label


class AnnouncementApplicationService:
    def __init__(
        self,
        announcements: AnnouncementRepositoryPort,
        notifications: NotificationRepositoryPort,
        file_storage: FileStoragePort,
    ):
        self.announcements = announcements
        self.notifications = notifications
        self.file_storage = file_storage

    def create_announcement(self, data: dict, current_user_id: int):
        self._validate_category(data["category"])
        data = data.copy()
        data["otros_subtype"] = data.get("otros_subtype") if data["category"] == "OTROS" else None

        announcement = self.announcements.create(data, published_by=current_user_id)
        announcement_type = get_announcement_type_label(announcement.category)
        self.notifications.create_for_active_users(announcement, announcement_type)
        return announcement

    def list_announcements(
        self,
        categories: str | None,
        search: str | None,
        include_inactive: bool,
        current_user,
    ):
        can_include_inactive = include_inactive and self._is_secretario(current_user)
        category_list = [c.strip().upper() for c in categories.split(",")] if categories else None

        return self.announcements.list_announcements(
            categories=category_list,
            search=search,
            include_inactive=can_include_inactive,
        )

    def update_announcement(self, announcement_id: int, data: dict):
        announcement = self._get_announcement(announcement_id)

        if data.get("title") is not None:
            announcement.title = data["title"]
        if data.get("content") is not None:
            announcement.content = data["content"]
        if data.get("category") is not None:
            self._validate_category(data["category"])
            announcement.category = data["category"]
        if data.get("otros_subtype") is not None:
            announcement.otros_subtype = (
                data["otros_subtype"] if announcement.category == "OTROS" else None
            )

        return self.announcements.save(announcement)

    def activate_announcement(self, announcement_id: int):
        announcement = self._get_announcement(announcement_id)
        announcement.is_active = True
        return self.announcements.save(announcement)

    def deactivate_announcement(self, announcement_id: int):
        announcement = self._get_announcement(announcement_id)
        announcement.is_active = False
        return self.announcements.save(announcement)

    async def upload_image(self, announcement_id: int, file):
        announcement = self._get_announcement(announcement_id)
        announcement.image_url = await self.file_storage.save_announcement_image(
            file,
            previous_image_url=announcement.image_url,
        )
        return self.announcements.save(announcement)

    def delete_image(self, announcement_id: int):
        announcement = self._get_announcement(announcement_id)
        self.file_storage.delete_announcement_image(announcement.image_url)
        announcement.image_url = None
        return self.announcements.save(announcement)

    def _get_announcement(self, announcement_id: int):
        announcement = self.announcements.find_by_id(announcement_id)
        if not announcement:
            raise ApplicationError(status_code=404, detail="Anuncio no encontrado")
        return announcement

    def _validate_category(self, category: str) -> None:
        if category not in ALL_CATEGORIES:
            raise ApplicationError(
                status_code=400,
                detail=f"Categoria invalida. Categorias permitidas: {', '.join(ALL_CATEGORIES)}",
            )

    def _is_secretario(self, user) -> bool:
        return any(role.name == "SECRETARIO" for role in user.roles)

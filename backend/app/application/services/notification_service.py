from app.application.exceptions import ApplicationError
from app.application.ports.repositories import NotificationRepositoryPort


class NotificationApplicationService:
    def __init__(self, notifications: NotificationRepositoryPort):
        self.notifications = notifications

    def list_notifications(self, user_id: int):
        return self.notifications.list_for_user(user_id)

    def list_unread_notifications(self, user_id: int):
        return self.notifications.list_for_user(user_id, unread_only=True)

    def unread_count(self, user_id: int) -> int:
        return self.notifications.count_unread(user_id)

    def mark_as_read(self, notification_id: int, user_id: int):
        notification = self.notifications.find_for_user(notification_id, user_id)
        if not notification:
            raise ApplicationError(status_code=404, detail="Notificacion no encontrada")

        notification.is_read = True
        return self.notifications.save(notification)

    def mark_all_as_read(self, user_id: int) -> dict[str, str]:
        self.notifications.mark_all_as_read(user_id)
        return {"message": "Todas las notificaciones marcadas como leidas"}

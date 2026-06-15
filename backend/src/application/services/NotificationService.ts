import { AppDataSource } from "../../config/data-source";
import { NotificationEntity } from "../../infrastructure/persistence/entities/NotificationEntity";
import { AppError } from "../../shared/errors/AppError";
import { notificationResponse } from "../dto/responses";

export class NotificationService {
  private notifications = AppDataSource.getRepository(NotificationEntity);

  async list(userId: number, unreadOnly = false) {
    const notifications = await this.notifications.find({
      where: unreadOnly ? { userId, isRead: false } : { userId },
      order: { createdAt: "DESC" },
    });
    return notifications.map(notificationResponse);
  }

  async unreadCount(userId: number) {
    return {
      count: await this.notifications.count({ where: { userId, isRead: false } }),
    };
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.notifications.findOne({ where: { id, userId } });
    if (!notification) {
      throw new AppError(404, "Notificacion no encontrada");
    }
    notification.isRead = true;
    return notificationResponse(await this.notifications.save(notification));
  }

  async markAllAsRead(userId: number) {
    await this.notifications.update({ userId, isRead: false }, { isRead: true });
    return { status: "ok" };
  }
}

import { AnnouncementEntity } from "../../infrastructure/persistence/entities/AnnouncementEntity";
import { DocumentEntity } from "../../infrastructure/persistence/entities/DocumentEntity";
import { NotificationEntity } from "../../infrastructure/persistence/entities/NotificationEntity";
import { UserEntity } from "../../infrastructure/persistence/entities/UserEntity";

export function userResponse(user: UserEntity) {
  return {
    id: user.id,
    nombres: user.nombres,
    apellidos: user.apellidos,
    cedula: user.cedula,
    email: user.email,
    is_active: user.isActive,
    must_change_password: user.mustChangePassword,
    created_at: user.createdAt,
    roles: user.roles?.map((role) => role.name) ?? [],
  };
}

export function announcementResponse(announcement: AnnouncementEntity) {
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    category: announcement.category,
    otros_subtype: announcement.otrosSubtype,
    is_active: announcement.isActive,
    image_url: announcement.imageUrl,
    created_at: announcement.createdAt,
    published_by: announcement.publishedBy,
    publisher_name: announcement.publisher
      ? `${announcement.publisher.nombres} ${announcement.publisher.apellidos}`
      : "Desconocido",
  };
}

export function documentResponse(document: DocumentEntity) {
  return {
    id: document.id,
    filename: document.filename,
    file_path: `static/documents/${document.filename}`,
    uploaded_by_id: document.uploadedById,
    uploader_name: document.uploader
      ? `${document.uploader.nombres} ${document.uploader.apellidos}`
      : "Desconocido",
    status: document.status,
    error_message: document.errorMessage,
    created_at: document.createdAt,
  };
}

export function notificationResponse(notification: NotificationEntity) {
  return {
    id: notification.id,
    user_id: notification.userId,
    title: notification.title,
    message: notification.message,
    announcement_type: notification.announcementType,
    announcement_id: notification.announcementId,
    is_read: notification.isRead,
    created_at: notification.createdAt,
  };
}

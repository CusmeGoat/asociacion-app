import fs from "fs";
import path from "path";

import { IsNull } from "typeorm";

import { AppDataSource } from "../../config/data-source";
import { env } from "../../config/env";
import { AnnouncementEntity } from "../../infrastructure/persistence/entities/AnnouncementEntity";
import { NotificationEntity } from "../../infrastructure/persistence/entities/NotificationEntity";
import { UserEntity } from "../../infrastructure/persistence/entities/UserEntity";
import { AppError } from "../../shared/errors/AppError";
import { announcementResponse } from "../dto/responses";

export class AnnouncementService {
  private announcements = AppDataSource.getRepository(AnnouncementEntity);
  private notifications = AppDataSource.getRepository(NotificationEntity);
  private users = AppDataSource.getRepository(UserEntity);

  async create(
    input: {
      title: string;
      content: string;
      category: string;
      otros_subtype?: string | null;
    },
    currentUserId: string,
    file?: Express.Multer.File,
  ) {
    const announcement = await this.announcements.save(
      this.announcements.create({
        title: input.title,
        content: input.content,
        category: input.category,
        otrosSubtype: input.otros_subtype ?? null,
        isActive: true,
        imageUrl: file ? `/static/images/${file.filename}` : null,
        publishedBy: currentUserId,
      }),
    );

    await this.createNotifications(announcement);
    return announcementResponse(await this.findById(announcement.id));
  }

  async list(filters: {
    categories?: string;
    search?: string;
    includeInactive?: boolean;
    isSecretary: boolean;
  }) {
    const query = this.announcements
      .createQueryBuilder("announcement")
      .leftJoinAndSelect("announcement.publisher", "publisher")
      .where("announcement.deletedAt IS NULL")
      .orderBy("announcement.createdAt", "DESC");

    if (!filters.includeInactive || !filters.isSecretary) {
      query.andWhere("announcement.isActive = true");
    }
    if (filters.categories) {
      query.andWhere("announcement.category IN (:...categories)", {
        categories: filters.categories.split(",").map((item) => item.trim()),
      });
    }
    if (filters.search) {
      query.andWhere(
        "(announcement.title ILIKE :search OR announcement.content ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    return (await query.getMany()).map(announcementResponse);
  }

  async update(
    id: string,
    input: Partial<{
      title: string;
      content: string;
      category: string;
      otros_subtype: string | null;
      is_active: boolean;
    }>,
    currentUserId: string,
    isSecretary: boolean,
    file?: Express.Multer.File,
  ) {
    const announcement = await this.findById(id);
    this.ensureCanModify(announcement, currentUserId, isSecretary);

    announcement.title = input.title ?? announcement.title;
    announcement.content = input.content ?? announcement.content;
    announcement.category = input.category ?? announcement.category;
    announcement.otrosSubtype =
      input.otros_subtype === undefined ? announcement.otrosSubtype : input.otros_subtype;
    if (isSecretary && input.is_active !== undefined) {
      announcement.isActive = input.is_active;
    }
    if (file) {
      this.deleteImageFile(announcement.imageUrl);
      announcement.imageUrl = `/static/images/${file.filename}`;
    }
    return announcementResponse(await this.announcements.save(announcement));
  }

  async setActive(id: string, active: boolean) {
    const announcement = await this.findById(id);
    announcement.isActive = active;
    return announcementResponse(await this.announcements.save(announcement));
  }

  async delete(id: string, currentUserId: string, isSecretary: boolean) {
    const announcement = await this.findById(id);
    this.ensureCanModify(announcement, currentUserId, isSecretary);

    this.deleteImageFile(announcement.imageUrl);
    announcement.imageUrl = null;
    announcement.isActive = false;
    announcement.deletedAt = new Date();
    announcement.deletedBy = currentUserId;
    await this.announcements.save(announcement);

    return {
      status: "ok",
      message: "Anuncio eliminado correctamente.",
      deleted_by: currentUserId,
    };
  }

  async setImage(
    id: string,
    file: Express.Multer.File,
    currentUserId: string,
    isSecretary: boolean,
  ) {
    const announcement = await this.findById(id);
    this.ensureCanModify(announcement, currentUserId, isSecretary);
    this.deleteImageFile(announcement.imageUrl);
    announcement.imageUrl = `/static/images/${file.filename}`;
    return announcementResponse(await this.announcements.save(announcement));
  }

  async deleteImage(id: string, currentUserId: string, isSecretary: boolean) {
    const announcement = await this.findById(id);
    this.ensureCanModify(announcement, currentUserId, isSecretary);
    this.deleteImageFile(announcement.imageUrl);
    announcement.imageUrl = null;
    return announcementResponse(await this.announcements.save(announcement));
  }

  private async createNotifications(announcement: AnnouncementEntity) {
    const activeUsers = await this.users.find({ where: { isActive: true } });
    const notifications = activeUsers.map((user) =>
      this.notifications.create({
        userId: user.id,
        title: `Nuevo anuncio: ${announcement.title}`,
        message: announcement.content.slice(0, 500),
        announcementType: announcement.category,
        announcementId: announcement.id,
        isRead: false,
      }),
    );
    await this.notifications.save(notifications);
  }

  private async findById(id: string) {
    const announcement = await this.announcements.findOne({ where: { id, deletedAt: IsNull() } });
    if (!announcement) {
      throw new AppError(404, "Anuncio no encontrado");
    }
    return announcement;
  }

  private ensureCanModify(
    announcement: AnnouncementEntity,
    currentUserId: string,
    isSecretary: boolean,
  ) {
    const isOwner = announcement.publishedBy === currentUserId;

    if (!isSecretary && !isOwner) {
      throw new AppError(403, "Solo puedes modificar anuncios creados por tu usuario.");
    }
  }

  private deleteImageFile(imageUrl: string | null) {
    if (!imageUrl) return;
    const filename = imageUrl.split("/").pop();
    if (!filename) return;
    const imagePath = path.join(process.cwd(), env.staticRoot, "images", filename);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }
}

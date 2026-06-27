import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { UserEntity } from "./UserEntity";

@Entity({ name: "announcements" })
export class AnnouncementEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 150 })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "varchar", length: 50 })
  category!: string;

  @Column({ name: "otros_subtype", type: "varchar", length: 100, nullable: true })
  otrosSubtype!: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "image_url", type: "varchar", length: 300, nullable: true })
  imageUrl!: string | null;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;

  @Column({ name: "deleted_by", type: "integer", nullable: true })
  deletedBy!: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "published_by", type: "integer" })
  publishedBy!: number;

  @ManyToOne(() => UserEntity, (user) => user.announcements, { eager: true })
  @JoinColumn({ name: "published_by" })
  publisher!: UserEntity;
}

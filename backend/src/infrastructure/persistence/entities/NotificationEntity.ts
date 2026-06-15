import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { UserEntity } from "./UserEntity";

@Entity({ name: "notifications" })
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "user_id", type: "integer" })
  userId!: number;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "varchar", length: 500 })
  message!: string;

  @Column({ name: "announcement_type", type: "varchar", length: 50 })
  announcementType!: string;

  @Column({ name: "announcement_id", type: "integer", nullable: true })
  announcementId!: number | null;

  @Column({ name: "is_read", type: "boolean", default: false })
  isRead!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.notifications)
  @JoinColumn({ name: "user_id" })
  user!: UserEntity;
}

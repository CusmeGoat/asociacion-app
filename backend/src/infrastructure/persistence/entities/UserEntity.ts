import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

import { AnnouncementEntity } from "./AnnouncementEntity";
import { DocumentEntity } from "./DocumentEntity";
import { NotificationEntity } from "./NotificationEntity";
import { RoleEntity } from "./RoleEntity";

@Entity({ name: "users" })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 100 })
  nombres!: string;

  @Column({ type: "varchar", length: 100 })
  apellidos!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  cedula!: string | null;

  @Column({ type: "varchar", length: 150, unique: true })
  email!: string;

  @Column({ name: "password_hash", type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "must_change_password", type: "boolean", default: false })
  mustChangePassword!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @ManyToMany(() => RoleEntity, (role) => role.users, { eager: true })
  @JoinTable({
    name: "user_roles",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "role_id", referencedColumnName: "id" },
  })
  roles!: RoleEntity[];

  @OneToMany(() => DocumentEntity, (document) => document.uploader)
  documents!: DocumentEntity[];

  @OneToMany(() => AnnouncementEntity, (announcement) => announcement.publisher)
  announcements!: AnnouncementEntity[];

  @OneToMany(() => NotificationEntity, (notification) => notification.user)
  notifications!: NotificationEntity[];
}

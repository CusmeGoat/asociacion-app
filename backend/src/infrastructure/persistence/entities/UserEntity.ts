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

@Entity({ name: "usuarios" })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 100 })
  nombres!: string;

  @Column({ type: "varchar", length: 100 })
  apellidos!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  cedula!: string | null;

  @Column({ name: "correo", type: "varchar", length: 150, unique: true })
  email!: string;

  @Column({ name: "contrasena_hash", type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ name: "activo", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "debe_cambiar_contrasena", type: "boolean", default: false })
  mustChangePassword!: boolean;

  @CreateDateColumn({ name: "creado_en", type: "timestamptz" })
  createdAt!: Date;

  @ManyToMany(() => RoleEntity, (role) => role.users, { eager: true })
  @JoinTable({
    name: "roles_usuario",
    joinColumn: { name: "usuario_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "rol_id", referencedColumnName: "id" },
  })
  roles!: RoleEntity[];

  @OneToMany(() => DocumentEntity, (document) => document.uploader)
  documents!: DocumentEntity[];

  @OneToMany(() => AnnouncementEntity, (announcement) => announcement.publisher)
  announcements!: AnnouncementEntity[];

  @OneToMany(() => NotificationEntity, (notification) => notification.user)
  notifications!: NotificationEntity[];
}

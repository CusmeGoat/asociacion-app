import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { randomUUID } from "crypto";

import { AnnouncementEntity } from "./AnnouncementEntity";
import { DocumentEntity } from "./DocumentEntity";
import { NotificationEntity } from "./NotificationEntity";
import { RoleEntity } from "./RoleEntity";

@Entity({ name: "usuarios" })
export class UserEntity {
  @PrimaryColumn({ type: "text" })
  id!: string;

  @Column({ name: "nombre", type: "text" })
  nombres!: string;

  @Column({ name: "apellido", type: "text" })
  apellidos!: string;

  @Column({ name: "cedula", type: "varchar" })
  cedula!: string;

  @Column({ name: "email", type: "text", nullable: true })
  email!: string;

  @Column({ name: "password", type: "text" })
  passwordHash!: string;

  @Column({ name: "activo", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "debeCambiarContrasena", type: "boolean", default: false })
  mustChangePassword!: boolean;

  @CreateDateColumn({ name: "createdAt", type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updatedAt", type: "timestamp" })
  updatedAt!: Date;

  @ManyToMany(() => RoleEntity, (role) => role.users, { eager: true })
  @JoinTable({
    name: "roles_usuario",
    joinColumn: { name: "usuarioId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "rolNombre", referencedColumnName: "name" },
  })
  roles!: RoleEntity[];

  @OneToMany(() => DocumentEntity, (document) => document.uploader)
  documents!: DocumentEntity[];

  @OneToMany(() => AnnouncementEntity, (announcement) => announcement.publisher)
  announcements!: AnnouncementEntity[];

  @OneToMany(() => NotificationEntity, (notification) => notification.user)
  notifications!: NotificationEntity[];

  @BeforeInsert()
  ensureId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}

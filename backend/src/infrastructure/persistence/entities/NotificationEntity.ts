import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { randomUUID } from "crypto";

import { UserEntity } from "./UserEntity";

@Entity({ name: "notificaciones" })
export class NotificationEntity {
  @PrimaryColumn({ type: "text" })
  id!: string;

  @Column({ name: "usuarioId", type: "text" })
  userId!: string;

  @Column({ name: "titulo", type: "varchar", length: 200 })
  title!: string;

  @Column({ name: "mensaje", type: "varchar", length: 500 })
  message!: string;

  @Column({ name: "tipoAnuncio", type: "varchar" })
  announcementType!: string;

  @Column({ name: "anuncioId", type: "text", nullable: true })
  announcementId!: string | null;

  @Column({ name: "leido", type: "boolean", default: false })
  isRead!: boolean;

  @CreateDateColumn({ name: "createdAt", type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.notifications)
  @JoinColumn({ name: "usuarioId" })
  user!: UserEntity;

  @BeforeInsert()
  ensureId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { UserEntity } from "./UserEntity";

@Entity({ name: "notificaciones" })
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "usuario_id", type: "integer" })
  userId!: number;

  @Column({ name: "titulo", type: "varchar", length: 200 })
  title!: string;

  @Column({ name: "mensaje", type: "varchar", length: 500 })
  message!: string;

  @Column({ name: "tipo_anuncio", type: "varchar", length: 50 })
  announcementType!: string;

  @Column({ name: "anuncio_id", type: "integer", nullable: true })
  announcementId!: number | null;

  @Column({ name: "leido", type: "boolean", default: false })
  isRead!: boolean;

  @CreateDateColumn({ name: "creado_en", type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.notifications)
  @JoinColumn({ name: "usuario_id" })
  user!: UserEntity;
}

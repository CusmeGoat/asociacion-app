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

@Entity({ name: "anuncios" })
export class AnnouncementEntity {
  @PrimaryColumn({ type: "text" })
  id!: string;

  @Column({ name: "titulo", type: "varchar", length: 150 })
  title!: string;

  @Column({ name: "contenido", type: "text" })
  content!: string;

  @Column({ name: "categoria", type: "varchar", length: 50 })
  category!: string;

  @Column({ name: "otrosSubtipo", type: "varchar", nullable: true })
  otrosSubtype!: string | null;

  @Column({ name: "activo", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "urlImagen", type: "varchar", nullable: true })
  imageUrl!: string | null;

  @Column({ name: "eliminadoEn", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;

  @Column({ name: "eliminadoPorId", type: "text", nullable: true })
  deletedBy!: string | null;

  @CreateDateColumn({ name: "createdAt", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "publicadoPorId", type: "text" })
  publishedBy!: string;

  @ManyToOne(() => UserEntity, (user) => user.announcements, { eager: true })
  @JoinColumn({ name: "publicadoPorId" })
  publisher!: UserEntity;

  @BeforeInsert()
  ensureId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}

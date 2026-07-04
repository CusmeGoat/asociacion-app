import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { UserEntity } from "./UserEntity";

@Entity({ name: "anuncios" })
export class AnnouncementEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "titulo", type: "varchar", length: 150 })
  title!: string;

  @Column({ name: "contenido", type: "text" })
  content!: string;

  @Column({ name: "categoria", type: "varchar", length: 50 })
  category!: string;

  @Column({ name: "otros_subtipo", type: "varchar", length: 100, nullable: true })
  otrosSubtype!: string | null;

  @Column({ name: "activo", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "url_imagen", type: "varchar", length: 300, nullable: true })
  imageUrl!: string | null;

  @Column({ name: "eliminado_en", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;

  @Column({ name: "eliminado_por", type: "integer", nullable: true })
  deletedBy!: number | null;

  @CreateDateColumn({ name: "creado_en", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "publicado_por", type: "integer" })
  publishedBy!: number;

  @ManyToOne(() => UserEntity, (user) => user.announcements, { eager: true })
  @JoinColumn({ name: "publicado_por" })
  publisher!: UserEntity;
}

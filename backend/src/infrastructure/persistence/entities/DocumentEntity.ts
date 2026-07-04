import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { UserEntity } from "./UserEntity";

@Entity({ name: "documentos" })
export class DocumentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "nombre_archivo", type: "varchar", length: 255 })
  filename!: string;

  @Column({ name: "ruta_archivo", type: "varchar", length: 500 })
  filePath!: string;

  @Column({ name: "subido_por_id", type: "integer" })
  uploadedById!: number;

  @Column({ name: "estado", type: "varchar", length: 20, default: "pendiente" })
  status!: "pendiente" | "en_proceso" | "completado" | "error";

  @Column({ name: "mensaje_error", type: "text", nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: "creado_en", type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.documents, { eager: true })
  @JoinColumn({ name: "subido_por_id" })
  uploader!: UserEntity;
}

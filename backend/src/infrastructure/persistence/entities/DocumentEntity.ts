import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { randomUUID } from "crypto";

import { UserEntity } from "./UserEntity";

@Entity({ name: "documentos" })
export class DocumentEntity {
  @PrimaryColumn({ type: "text" })
  id!: string;

  @Column({ name: "codigo", type: "text" })
  code!: string;

  @Column({ name: "titulo", type: "text" })
  title!: string;

  @Column({ name: "tipo", type: "text" })
  type!: string;

  @Column({ name: "descripcion", type: "text", nullable: true })
  description!: string | null;

  @Column({ name: "fecha", type: "timestamp" })
  date!: Date;

  @Column({ name: "estado", type: "text", default: "ACTIVO" })
  documentStatus!: string;

  @Column({ name: "archivoUrl", type: "text", nullable: true })
  fileUrl!: string | null;

  @Column({ name: "archivoNombre", type: "text", nullable: true })
  filename!: string;

  @Column({ name: "chatbotRutaArchivo", type: "text", nullable: true })
  filePath!: string;

  @Column({ name: "creadoPorId", type: "text" })
  uploadedById!: string;

  @Column({ name: "chatbotEstado", type: "varchar", length: 20, nullable: true })
  status!: "pendiente" | "en_proceso" | "completado" | "error" | null;

  @Column({ name: "chatbotMensajeError", type: "text", nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: "createdAt", type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updatedAt", type: "timestamp" })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.documents, { eager: true })
  @JoinColumn({ name: "creadoPorId" })
  uploader!: UserEntity;

  @BeforeInsert()
  ensureId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { UserEntity } from "./UserEntity";

@Entity({ name: "documents" })
export class DocumentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  filename!: string;

  @Column({ name: "file_path", type: "varchar", length: 500 })
  filePath!: string;

  @Column({ name: "uploaded_by_id", type: "integer" })
  uploadedById!: number;

  @Column({ type: "varchar", length: 20, default: "pendiente" })
  status!: "pendiente" | "en_proceso" | "completado" | "error";

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.documents, { eager: true })
  @JoinColumn({ name: "uploaded_by_id" })
  uploader!: UserEntity;
}

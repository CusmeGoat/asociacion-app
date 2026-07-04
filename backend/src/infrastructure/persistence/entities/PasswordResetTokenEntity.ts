import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "tokens_restablecimiento_clave" })
export class PasswordResetTokenEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "usuario_id", type: "integer" })
  userId!: number;

  @Column({ name: "token", type: "varchar", length: 255, unique: true })
  token!: string;

  @Column({ name: "expira_en", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "usado_en", type: "timestamptz", nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: "creado_en", type: "timestamptz" })
  createdAt!: Date;
}

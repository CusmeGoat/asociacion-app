import { BeforeInsert, Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";
import { randomUUID } from "crypto";

@Entity({ name: "tokens_restablecimiento_clave" })
export class PasswordResetTokenEntity {
  @PrimaryColumn({ type: "text" })
  id!: string;

  @Column({ name: "usuarioId", type: "text" })
  userId!: string;

  @Column({ name: "token", type: "varchar", length: 255, unique: true })
  token!: string;

  @Column({ name: "expiraEn", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "usadoEn", type: "timestamptz", nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: "createdAt", type: "timestamptz" })
  createdAt!: Date;

  @BeforeInsert()
  ensureId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}

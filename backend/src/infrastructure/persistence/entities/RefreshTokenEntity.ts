import { BeforeInsert, Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";
import { randomUUID } from "crypto";

@Entity({ name: "tokens_actualizacion" })
export class RefreshTokenEntity {
  @PrimaryColumn({ type: "text" })
  id!: string;

  @Column({ name: "usuarioId", type: "text" })
  userId!: string;

  @Column({ name: "hashToken", type: "varchar", unique: true })
  tokenHash!: string;

  @Column({ name: "expiraEn", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "revocadoEn", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: "createdAt", type: "timestamptz" })
  createdAt!: Date;

  @BeforeInsert()
  ensureId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}

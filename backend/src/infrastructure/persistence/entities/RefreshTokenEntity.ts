import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "tokens_actualizacion" })
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "usuario_id", type: "integer" })
  userId!: number;

  @Column({ name: "hash_token", type: "varchar", length: 255, unique: true })
  tokenHash!: string;

  @Column({ name: "expira_en", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "revocado_en", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: "creado_en", type: "timestamptz" })
  createdAt!: Date;
}

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "password_reset_tokens" })
export class PasswordResetTokenEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "user_id", type: "integer" })
  userId!: number;

  @Column({ type: "varchar", length: 255, unique: true })
  token!: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "used_at", type: "timestamptz", nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

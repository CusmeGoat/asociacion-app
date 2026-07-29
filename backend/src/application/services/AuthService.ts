import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

import { env } from "../../config/env";
import { AppDataSource } from "../../config/data-source";
import { PasswordResetTokenEntity } from "../../infrastructure/persistence/entities/PasswordResetTokenEntity";
import { RefreshTokenEntity } from "../../infrastructure/persistence/entities/RefreshTokenEntity";
import { UserEntity } from "../../infrastructure/persistence/entities/UserEntity";
import { EmailService } from "../../infrastructure/services/EmailService";
import { AppError } from "../../shared/errors/AppError";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
} from "../../shared/security/tokens";
import { userResponse } from "../dto/responses";

export class AuthService {
  private users = AppDataSource.getRepository(UserEntity);
  private refreshTokens = AppDataSource.getRepository(RefreshTokenEntity);
  private passwordResetTokens = AppDataSource.getRepository(PasswordResetTokenEntity);
  private email = new EmailService();

  async login(cedula: string, password: string) {
    const cleanCedula = this.normalizeCedula(cedula);
    const user = await this.users.findOne({ where: { cedula: cleanCedula } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, "Credenciales incorrectas");
    }
    if (!user.isActive) {
      throw new AppError(403, "Usuario inactivo");
    }

    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const entry = await this.refreshTokens.findOne({ where: { tokenHash } });

    if (!entry || entry.revokedAt || entry.expiresAt <= new Date()) {
      throw new AppError(401, "Refresh token invalido o expirado");
    }

    const user = await this.users.findOne({ where: { id: entry.userId } });
    if (!user || !user.isActive) {
      throw new AppError(401, "Usuario no autorizado");
    }

    entry.revokedAt = new Date();
    await this.refreshTokens.save(entry);
    return this.issueTokenPair(user);
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const entry = await this.refreshTokens.findOne({ where: { tokenHash } });
    if (entry && !entry.revokedAt) {
      entry.revokedAt = new Date();
      await this.refreshTokens.save(entry);
    }
    return { message: "Sesion cerrada correctamente" };
  }

  async updatePassword(user: UserEntity, newPassword: string) {
    if (newPassword.length < 8) {
      throw new AppError(400, "La contrasena debe tener al menos 8 caracteres");
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    return userResponse(await this.users.save(user));
  }

  async forgotPassword(email: string) {
    const user = await this.users.findOne({ where: { email } });
    const message = "Si el correo existe, recibiras un codigo de restablecimiento.";
    if (!user) {
      return { message, reset_token: null };
    }

    const token = await this.createPasswordResetCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.passwordResetTokens.save(
      this.passwordResetTokens.create({
        userId: user.id,
        token,
        expiresAt,
        usedAt: null,
      }),
    );

    let emailResult: { sent: boolean; reason?: string };
    try {
      emailResult = await this.email.sendResetPasswordEmail({
        toEmail: user.email,
        nombre: `${user.nombres} ${user.apellidos}`,
        resetToken: token,
      });
    } catch (error) {
      console.error("[email] No se pudo enviar el codigo de recuperacion", error);
      emailResult = { sent: false, reason: "Error SMTP" };
    }

    if (!emailResult.sent && env.nodeEnv !== "production") {
      return {
        message:
          "SMTP no esta configurado. Para pruebas, usa el codigo mostrado en esta pantalla y en la consola del backend.",
        reset_token: token,
      };
    }

    return { message, reset_token: null };
  }

  async resetPassword(token: string, newPassword: string) {
    const entry = await this.passwordResetTokens.findOne({ where: { token } });
    if (!entry || entry.usedAt || entry.expiresAt <= new Date()) {
      throw new AppError(400, "Token de restablecimiento invalido o expirado");
    }
    if (newPassword.length < 8) {
      throw new AppError(400, "La contrasena debe tener al menos 8 caracteres");
    }

    const user = await this.users.findOne({ where: { id: entry.userId } });
    if (!user) {
      throw new AppError(404, "Usuario no encontrado");
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    entry.usedAt = new Date();
    await this.users.save(user);
    await this.passwordResetTokens.save(entry);
    return { message: "Contrasena actualizada correctamente" };
  }

  private async issueTokenPair(user: UserEntity) {
    const accessToken = createAccessToken({
      sub: user.email,
      user_id: user.id,
    });
    const refreshToken = createRefreshToken();
    const expiresAt = new Date(
      Date.now() + env.refreshTokenExpiresDays * 24 * 60 * 60 * 1000,
    );

    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
        revokedAt: null,
      }),
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      user: userResponse(user),
    };
  }

  private normalizeCedula(value: string) {
    return value?.toString().replace(/\D/g, "") ?? "";
  }

  private async createPasswordResetCode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = randomInt(100000, 1000000).toString();
      const existing = await this.passwordResetTokens.findOne({ where: { token } });
      if (!existing) {
        return token;
      }
    }

    return createRefreshToken();
  }
}

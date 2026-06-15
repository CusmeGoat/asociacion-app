import type { NextFunction, Request, Response } from "express";

import { AppDataSource } from "../../../config/data-source";
import { UserEntity } from "../../../infrastructure/persistence/entities/UserEntity";
import { AppError } from "../../../shared/errors/AppError";
import { verifyAccessToken } from "../../../shared/security/tokens";

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, "Token requerido");
    }

    const payload = verifyAccessToken(header.replace("Bearer ", ""));
    const user = await AppDataSource.getRepository(UserEntity).findOne({
      where: { id: payload.user_id },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, "Token invalido o usuario inactivo");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, "Token invalido o expirado"));
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userRoles = req.user?.roles.map((role) => role.name) ?? [];
    const allowed = roles.some((role) => userRoles.includes(role));

    if (!allowed) {
      next(new AppError(403, "No tienes permisos para realizar esta accion"));
      return;
    }

    next();
  };
}

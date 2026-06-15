import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../../shared/errors/AppError";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ detail: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ detail: "Error interno del servidor" });
}

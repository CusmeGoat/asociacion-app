import type { NextFunction, Request, Response } from "express";
import multer from "multer";

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

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "El archivo supera el tamano permitido."
        : `No se pudo procesar el archivo: ${error.message}`;
    res.status(400).json({ detail: message });
    return;
  }

  console.error(error);
  res.status(500).json({ detail: "Error interno del servidor" });
}

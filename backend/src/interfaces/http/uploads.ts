import fs from "fs";
import path from "path";

import multer from "multer";

import { env } from "../../config/env";
import { AppError } from "../../shared/errors/AppError";

function ensureDirectory(directory: string) {
  fs.mkdirSync(directory, { recursive: true });
}

function safeFilename(originalName: string) {
  const normalized = originalName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${normalized}`;
}

function hasExtension(filename: string, allowedExtensions: string[]) {
  const lower = filename.toLowerCase();
  return allowedExtensions.some((extension) => lower.endsWith(extension));
}

function acceptsFile(
  file: Express.Multer.File,
  allowedMimeTypes: string[],
  allowedExtensions: string[],
) {
  return (
    allowedMimeTypes.includes(file.mimetype) ||
    (file.mimetype === "application/octet-stream" &&
      hasExtension(file.originalname, allowedExtensions)) ||
    hasExtension(file.originalname, allowedExtensions)
  );
}

function storageFor(folder: "documents" | "images") {
  const directory = path.join(process.cwd(), env.staticRoot, folder);
  ensureDirectory(directory);

  return multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, directory),
    filename: (_req, file, callback) => callback(null, safeFilename(file.originalname)),
  });
}

export const documentUpload = multer({
  storage: storageFor("documents"),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (acceptsFile(file, ["application/pdf"], [".pdf"])) {
      callback(null, true);
      return;
    }
    callback(new AppError(400, "El archivo debe ser un PDF valido."));
  },
});

export const imageUpload = multer({
  storage: storageFor("images"),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (
      acceptsFile(
        file,
        ["image/jpeg", "image/jpg", "image/png", "image/*"],
        [".jpg", ".jpeg", ".png"],
      )
    ) {
      callback(null, true);
      return;
    }
    callback(new AppError(400, "La imagen debe estar en formato JPG o PNG."));
  },
});

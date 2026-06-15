import fs from "fs";
import path from "path";

import multer from "multer";

import { env } from "../../config/env";

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
});

export const imageUpload = multer({
  storage: storageFor("images"),
  limits: { fileSize: 10 * 1024 * 1024 },
});

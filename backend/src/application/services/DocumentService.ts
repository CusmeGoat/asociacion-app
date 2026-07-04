import fs from "fs";
import path from "path";

import { AppDataSource } from "../../config/data-source";
import { env } from "../../config/env";
import { DocumentEntity } from "../../infrastructure/persistence/entities/DocumentEntity";
import { SemanticServiceClient } from "../../infrastructure/services/SemanticServiceClient";
import { AppError } from "../../shared/errors/AppError";
import { documentResponse } from "../dto/responses";

export class DocumentService {
  private documents = AppDataSource.getRepository(DocumentEntity);
  private semantic = new SemanticServiceClient();

  async list() {
    const documents = await this.documents.find({ order: { createdAt: "DESC" } });
    return documents.map(documentResponse);
  }

  async upload(file: Express.Multer.File, uploadedById: number) {
    if (!file.originalname.toLowerCase().endsWith(".pdf")) {
      throw new AppError(400, "El archivo debe ser un PDF valido");
    }

    const document = await this.documents.save(
      this.documents.create({
        filename: file.filename,
        filePath: path.join(env.staticRoot, "documents", file.filename),
        uploadedById,
        status: "pendiente",
        errorMessage: null,
      }),
    );

    this.indexInBackground(document).catch((error) => {
      console.error("[semantic-index]", error);
    });

    return {
      status: "ok",
      document_id: document.id,
      document: document.filename,
      message: "Documento subido. La indexacion se esta procesando en segundo plano.",
    };
  }

  async delete(documentId: number) {
    const document = await this.documents.findOne({ where: { id: documentId } });
    if (!document) {
      throw new AppError(404, "Documento no encontrado");
    }

    const absolutePath = this.resolveDocumentFilePath(document);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await this.semantic.deleteChunks(document.filename).catch(async () => {
      await AppDataSource.query("DELETE FROM fragmentos_documento WHERE nombre_documento = $1", [
        document.filename,
      ]);
    });
    await this.documents.remove(document);

    return {
      status: "ok",
      message: `Documento '${document.filename}' eliminado correctamente.`,
    };
  }

  async getFile(documentId: number) {
    const document = await this.documents.findOne({ where: { id: documentId } });
    if (!document) {
      throw new AppError(404, "Documento no encontrado");
    }

    const absolutePath = this.resolveDocumentFilePath(document);

    if (!fs.existsSync(absolutePath)) {
      throw new AppError(
        404,
        "El archivo PDF no existe en el servidor. Vuelve a cargar o sincronizar el documento.",
      );
    }

    return {
      absolutePath,
      filename: document.filename,
    };
  }

  private resolveDocumentFilePath(document: DocumentEntity) {
    const documentsRoot = path.resolve(process.cwd(), env.staticRoot, "documents");
    const storedPath = path.isAbsolute(document.filePath)
      ? document.filePath
      : path.resolve(process.cwd(), document.filePath);
    const candidates = [
      storedPath,
      path.resolve(documentsRoot, path.basename(document.filePath)),
      path.resolve(documentsRoot, document.filename),
    ];

    for (const candidate of [...new Set(candidates)]) {
      const absolutePath = path.resolve(candidate);
      const insideDocumentsRoot =
        absolutePath === documentsRoot || absolutePath.startsWith(`${documentsRoot}${path.sep}`);

      if (insideDocumentsRoot && fs.existsSync(absolutePath)) {
        return absolutePath;
      }
    }

    return path.resolve(documentsRoot, document.filename);
  }

  private async indexInBackground(document: DocumentEntity) {
    document.status = "en_proceso";
    document.errorMessage = null;
    await this.documents.save(document);

    try {
      await this.semantic.indexDocument({
        documentId: document.id,
        filename: document.filename,
        filePath: path.join(process.cwd(), document.filePath),
      });

      document.status = "completado";
      document.errorMessage = null;
      await this.documents.save(document);
    } catch (error) {
      document.status = "error";
      document.errorMessage =
        error instanceof Error ? error.message : "Error durante la indexacion";
      await this.documents.save(document);
    }
  }
}

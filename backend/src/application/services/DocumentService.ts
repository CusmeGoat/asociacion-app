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

    const absolutePath = path.join(process.cwd(), document.filePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await this.semantic.deleteChunks(document.filename).catch(async () => {
      await AppDataSource.query("DELETE FROM document_chunks WHERE document_name = $1", [
        document.filename,
      ]);
    });
    await this.documents.remove(document);

    return {
      status: "ok",
      message: `Documento '${document.filename}' eliminado correctamente.`,
    };
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

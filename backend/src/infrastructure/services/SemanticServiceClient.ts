import { env } from "../../config/env";
import { AppError } from "../../shared/errors/AppError";

export type SemanticSource = {
  content: string;
  page_number: number;
  document_name: string;
};

export class SemanticServiceClient {
  async indexDocument(input: {
    documentId: number;
    filename: string;
    filePath: string;
  }): Promise<void> {
    await this.post("/index", input);
  }

  async search(query: string, limit = 6): Promise<SemanticSource[]> {
    const response = await this.post<{ fuentes: SemanticSource[] }>("/search", {
      query,
      limit,
    });
    return response.fuentes;
  }

  async deleteChunks(filename: string): Promise<void> {
    await this.post("/chunks/delete", { filename });
  }

  private async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(`${env.semanticServiceUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      const unavailable =
        error instanceof Error && (error.name === "AbortError" || error.message.includes("fetch failed"));
      throw new AppError(
        503,
        unavailable
          ? "Servicio semantico no disponible. Verifica que semantic-service este levantado en el puerto 8010."
          : "No se pudo conectar con el servicio semantico documental.",
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new AppError(
        502,
        `Error en microservicio semantico (${response.status}): ${text}`,
      );
    }

    return (await response.json()) as T;
  }
}

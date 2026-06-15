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
    const response = await fetch(`${env.semanticServiceUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

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

import { env } from "../../config/env";
import { AppError } from "../../shared/errors/AppError";

export type SemanticSource = {
  document_id?: string;
  content: string;
  page_number: number;
  document_name: string;
  chunk_index?: number;
  distance?: number;
  score?: number;
  quality?: number;
  preview_url?: string;
  page_preview_url?: string;
  excerpt?: string;
};

export type SemanticHealth = {
  status: string;
  service: string;
};

export class SemanticServiceClient {
  async health(): Promise<SemanticHealth> {
    return this.request<SemanticHealth>("/health", { method: "GET" }, 8000);
  }

  async indexDocument(input: {
    documentId: string;
    filename: string;
    filePath: string;
  }): Promise<void> {
    await this.post("/index", input, 600000);
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

  async renderPagePreview(input: {
    filePath: string;
    page: number;
    dpi?: number;
  }): Promise<Buffer> {
    const response = await this.rawRequest(
      "/preview-page",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
      30000,
    );
    return Buffer.from(await response.arrayBuffer());
  }

  private async post<T = unknown>(
    path: string,
    body: unknown,
    timeoutMs = 30000,
  ): Promise<T> {
    return this.request<T>(
      path,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      timeoutMs,
    );
  }

  private async request<T = unknown>(
    path: string,
    options: RequestInit,
    timeoutMs: number,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const url = `${env.semanticServiceUrl}${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (error) {
      throw new AppError(503, this.connectionErrorMessage(error));
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const detail = this.extractErrorText(await response.text());
      const message =
        response.status >= 500
          ? `El microservicio semantico respondio con error (${response.status}). Revisa la consola de semantic-service. Detalle: ${detail}`
          : `Solicitud rechazada por el microservicio semantico (${response.status}). Detalle: ${detail}`;
      throw new AppError(response.status >= 500 ? 502 : response.status, message);
    }

    return (await response.json()) as T;
  }

  private async rawRequest(
    path: string,
    options: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const url = `${env.semanticServiceUrl}${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (error) {
      throw new AppError(503, this.connectionErrorMessage(error));
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const detail = this.extractErrorText(await response.text());
      throw new AppError(
        response.status >= 500 ? 502 : response.status,
        `No se pudo generar la previsualizacion del documento (${response.status}). Detalle: ${detail}`,
      );
    }

    return response;
  }

  private connectionErrorMessage(error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return "El servicio semantico tardo demasiado en responder. Espera a que termine de cargar el modelo de embeddings y vuelve a consultar.";
    }

    const cause = (error as { cause?: { code?: string; message?: string } })?.cause;
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("fetch failed") ||
      cause?.code === "ECONNREFUSED" ||
      cause?.code === "UND_ERR_CONNECT_TIMEOUT"
    ) {
      return `Servicio semantico no disponible. Verifica que semantic-service este levantado en ${env.semanticServiceUrl}.`;
    }

    return `No se pudo conectar con el servicio semantico documental. Detalle: ${
      message || "error desconocido"
    }`;
  }

  private extractErrorText(text: string) {
    if (!text) return "sin detalle";

    try {
      const parsed = JSON.parse(text) as { detail?: unknown; message?: unknown };
      const detail = parsed.detail ?? parsed.message;
      if (typeof detail === "string") {
        return detail.slice(0, 500);
      }
      if (detail) {
        return JSON.stringify(detail).slice(0, 500);
      }
    } catch {
      // Keep raw body when the semantic service returns plain text or HTML.
    }

    return text.trim().slice(0, 500) || "sin detalle";
  }
}

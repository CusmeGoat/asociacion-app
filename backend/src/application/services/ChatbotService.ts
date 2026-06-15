import { SemanticServiceClient, SemanticSource } from "../../infrastructure/services/SemanticServiceClient";

export class ChatbotService {
  private semantic = new SemanticServiceClient();

  async consultar(pregunta: string) {
    const fuentes = this.selectSources(await this.semantic.search(pregunta, 6));

    if (fuentes.length === 0) {
      return {
        respuesta:
          "No encontre informacion documental suficiente en los archivos cargados para responder esta consulta.",
        fuentes: [],
      };
    }

    const lines = [
      "Encontre estos fragmentos relacionados en los documentos institucionales cargados:",
      "",
    ];

    fuentes.forEach((fuente, index) => {
      lines.push(`${index + 1}. ${fuente.document_name} - pagina ${fuente.page_number}`);
      lines.push(this.truncate(fuente.content, 280));
      lines.push("");
    });

    lines.push("La respuesta se basa unicamente en documentos cargados por la asociacion.");

    return {
      respuesta: lines.join("\n").trim(),
      fuentes,
    };
  }

  private selectSources(sources: SemanticSource[]) {
    const selected: SemanticSource[] = [];
    const seen = new Set<string>();

    for (const source of sources) {
      const content = this.clean(source.content);
      if (content.length < 40) continue;

      const key = `${source.document_name}|${source.page_number}|${content}`;
      if (seen.has(key)) continue;
      seen.add(key);
      selected.push({ ...source, content });

      if (selected.length >= 3) break;
    }

    return selected;
  }

  private clean(text: string) {
    return text.split(/\s+/).join(" ").trim();
  }

  private truncate(text: string, maxLength: number) {
    return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3).trim()}...`;
  }
}

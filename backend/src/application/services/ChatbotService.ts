import { SemanticServiceClient, SemanticSource } from "../../infrastructure/services/SemanticServiceClient";

type ChatbotResponse = {
  respuesta: string;
  resumen: string;
  puntos: string[];
  aclaracion: string | null;
  fragmentos: SemanticSource[];
  fuentes: SemanticSource[];
};

type CandidatePoint = {
  text: string;
  score: number;
};

const STOP_WORDS = new Set([
  "sobre",
  "para",
  "como",
  "cuando",
  "donde",
  "cual",
  "cuales",
  "quien",
  "quienes",
  "dice",
  "indica",
  "menciona",
  "documento",
  "documentos",
  "informacion",
  "asociacion",
  "agricola",
  "mayo",
  "que",
  "del",
  "los",
  "las",
  "una",
  "uno",
  "por",
  "con",
  "sin",
  "este",
  "esta",
  "estos",
  "estas",
]);

const DOMAIN_WORDS = new Set([
  "asociacion",
  "directiva",
  "presidente",
  "secretario",
  "nombramiento",
  "juridica",
  "registro",
  "contribuyente",
  "contribuyentes",
  "administrativo",
  "administrativa",
  "autoridad",
  "autoridades",
  "competencia",
  "estatuto",
  "estatutos",
  "acta",
  "ruc",
  "sri",
  "legal",
  "tributario",
]);

export class ChatbotService {
  private semantic = new SemanticServiceClient();

  async consultar(pregunta: string): Promise<ChatbotResponse> {
    const fuentes = this.selectSources(await this.semantic.search(pregunta, 10));

    if (fuentes.length === 0) {
      const resumen =
        "No encontre informacion documental suficiente para responder con seguridad.";
      const puntos = [
        "Intenta preguntar con otras palabras o verifica que el documento este indexado.",
        "Si el documento fue escaneado, puede requerir una imagen mas clara para que el OCR lo lea bien.",
      ];
      return {
        respuesta: this.composeResponse(resumen, puntos, null),
        resumen,
        puntos,
        aclaracion: null,
        fragmentos: [],
        fuentes: [],
      };
    }

    const puntos = this.buildPoints(pregunta, fuentes);
    const hasReadablePoints = puntos.length > 0;
    const resumen = hasReadablePoints
      ? "Encontre informacion relacionada en los documentos institucionales."
      : "Encontre documentos relacionados, pero el texto extraido no es lo suficientemente claro.";
    const fallbackPoints = [
      "Revisa las fuentes consultadas para confirmar el detalle exacto.",
      "Si el archivo es un escaneo, subir una version mas nitida o exportada desde Word/PDF ayudara a mejorar las respuestas.",
    ];
    const finalPoints = hasReadablePoints ? puntos : fallbackPoints;
    const aclaracion = this.buildClarification(fuentes, hasReadablePoints);

    return {
      respuesta: this.composeResponse(resumen, finalPoints, aclaracion),
      resumen,
      puntos: finalPoints,
      aclaracion,
      fragmentos: this.fragmentSources(fuentes),
      fuentes,
    };
  }

  private selectSources(sources: SemanticSource[]) {
    const selected: SemanticSource[] = [];
    const seen = new Set<string>();

    for (const source of sources) {
      const content = this.clean(source.content);
      const quality = source.quality ?? this.textQuality(content);
      if (content.length < 40 || quality < 0.38) continue;

      const key = `${source.document_name}|${source.page_number}|${source.chunk_index ?? ""}|${content.slice(0, 120)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      selected.push({ ...source, content, quality });

      if (selected.length >= 4) break;
    }

    return selected;
  }

  private buildPoints(pregunta: string, fuentes: SemanticSource[]) {
    const terms = this.extractTerms(pregunta);
    const candidates: CandidatePoint[] = [];

    for (const fuente of fuentes) {
      const distanceScore =
        typeof fuente.distance === "number" ? Math.max(0, 1 - fuente.distance) : 0.35;

      for (const sentence of this.splitSentences(fuente.content)) {
        const point = this.tidyPoint(sentence);
        if (point.length < 45) continue;

        const normalized = this.normalizeForSearch(point);
        const termHits = terms.filter((term) => normalized.includes(term)).length;
        const domainHits = [...DOMAIN_WORDS].filter((term) => normalized.includes(term)).length;
        const quality = this.textQuality(point);

        if (quality < 0.48) continue;
        if (terms.length > 0 && termHits === 0 && domainHits === 0) continue;

        candidates.push({
          text: point,
          score: termHits * 2.5 + domainHits * 0.5 + quality * 2 + distanceScore,
        });
      }
    }

    return this.pickBestPoints(candidates);
  }

  private pickBestPoints(candidates: CandidatePoint[]) {
    const selected: string[] = [];
    const seen = new Set<string>();

    for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
      const key = this.normalizeForSearch(candidate.text).slice(0, 120);
      if (seen.has(key)) continue;
      seen.add(key);
      selected.push(candidate.text);
      if (selected.length >= 4) break;
    }

    return selected;
  }

  private splitSentences(text: string) {
    const normalized = this.clean(text);
    const sentences = normalized.match(/[^.!?;:]+[.!?;:]?/g) ?? [normalized];
    return sentences.flatMap((sentence) => {
      const cleanSentence = sentence.trim();
      if (cleanSentence.length <= 240) return [cleanSentence];
      return cleanSentence.split(/,\s+/).map((part) => part.trim());
    });
  }

  private extractTerms(text: string) {
    const normalized = this.normalizeForSearch(text);
    return [
      ...new Set(
        normalized
          .split(/[^a-z0-9]+/)
          .filter((word) => word.length >= 4 && !STOP_WORDS.has(word)),
      ),
    ];
  }

  private tidyPoint(text: string) {
    let point = this.clean(text)
      .replace(/^\d+[\).:-]\s*/, "")
      .replace(/^pagina\s+\d+\s*/i, "")
      .trim();

    point = point
      .split(" ")
      .filter((word) => this.keepReadableWord(word))
      .join(" ")
      .trim();

    if (point.length > 230) {
      point = `${point.slice(0, 227).trim()}...`;
    }

    if (point && !/[.!?]$/.test(point)) {
      point = `${point}.`;
    }

    return point;
  }

  private keepReadableWord(word: string) {
    const cleanWord = word.replace(/[.,;:!?()[\]{}"']/g, "");
    if (cleanWord.length <= 2) return true;
    if (/^[0-9./-]+$/.test(cleanWord)) return true;
    if (/^[A-ZÁÉÍÓÚÜÑ]{3,6}$/.test(cleanWord)) return true;
    if (!/[aeiouáéíóúüAEIOUÁÉÍÓÚÜ]/.test(cleanWord)) return false;
    const symbols = cleanWord.replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9/-]/g, "");
    return symbols.length <= 1;
  }

  private buildClarification(fuentes: SemanticSource[], hasReadablePoints: boolean) {
    const hasLowQualitySource = fuentes.some((fuente) => (fuente.quality ?? 1) < 0.62);
    if (!hasReadablePoints || hasLowQualitySource) {
      return "Algunos documentos parecen provenir de escaneos. La respuesta se muestra en lenguaje simple, pero conviene revisar las fuentes si necesitas el texto exacto.";
    }

    return null;
  }

  private composeResponse(resumen: string, puntos: string[], aclaracion: string | null) {
    const lines = [resumen, "", ...puntos.map((point) => `- ${point}`)];
    if (aclaracion) {
      lines.push("", aclaracion);
    }
    lines.push("", "La respuesta se basa unicamente en documentos cargados por la asociacion.");
    return lines.join("\n").trim();
  }

  private fragmentSources(fuentes: SemanticSource[]) {
    return fuentes.map((fuente) => ({
      ...fuente,
      content: this.truncate(fuente.content, 700),
    }));
  }

  private clean(text: string) {
    return (text || "")
      .normalize("NFKC")
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/([,.;:!?]){2,}/g, "$1")
      .replace(/\s+([,.;:!?])/g, "$1")
      .trim();
  }

  private normalizeForSearch(text: string) {
    return this.clean(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  private textQuality(text: string) {
    const visible = [...text].filter((char) => !/\s/.test(char));
    if (visible.length === 0) return 0;

    const readable = visible.filter(
      (char) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/.test(char) || ".,;:!?()[]/-".includes(char),
    );
    const words = this.normalizeForSearch(text)
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 3);
    const wordDensity = Math.min(words.length / 18, 1);
    const commonHits = words.filter((word) => STOP_WORDS.has(word) || DOMAIN_WORDS.has(word)).length;
    const commonRatio = words.length ? Math.min(commonHits / Math.max(words.length * 0.3, 1), 1) : 0;

    return Math.min(1, (readable.length / visible.length) * 0.55 + wordDensity * 0.25 + commonRatio * 0.2);
  }

  private truncate(text: string, maxLength: number) {
    return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3).trim()}...`;
  }
}

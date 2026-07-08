import { In } from "typeorm";

import { AppDataSource } from "../../config/data-source";
import { DocumentEntity } from "../../infrastructure/persistence/entities/DocumentEntity";
import { SemanticServiceClient, SemanticSource } from "../../infrastructure/services/SemanticServiceClient";

type ChatTable = {
  kind?: "socios" | "socio_lookup" | "default";
  caption?: string;
  columns: string[];
  rows: string[][];
};

type ChatbotResponse = {
  respuesta: string;
  respuesta_directa: string;
  resumen: string;
  puntos: string[];
  tabla: ChatTable | null;
  aclaracion: string | null;
  fragmentos: SemanticSource[];
  fuentes: SemanticSource[];
};

type CandidatePoint = {
  text: string;
  score: number;
  source: SemanticSource;
};

type ChatIntent = "socio_lookup" | "socio_list" | "general_document_query";

type SocioRecord = {
  number: number;
  name: string;
  cedula: string;
  page: number;
  documentName: string;
};

type IdentifierResponse = {
  respuestaDirecta: string;
  fuentes: SemanticSource[];
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
  "puedes",
  "puede",
  "darme",
  "dame",
  "lista",
  "listado",
  "quiero",
  "necesito",
  "favor",
  "tienes",
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
  "secretaria",
  "socio",
  "socios",
  "nomina",
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

const TABLE_TERMS = new Set([
  "socio",
  "socios",
  "rol",
  "roles",
  "nomina",
  "listado",
  "lista",
  "directiva",
  "integrantes",
  "miembros",
]);

const LOOKUP_STOP_WORDS = new Set([
  "cedula",
  "cedulas",
  "numero",
  "numeros",
  "identificacion",
  "identidad",
  "socio",
  "socios",
  "persona",
  "personas",
  "nombre",
  "nombres",
  "apellido",
  "apellidos",
  "saber",
  "indicar",
  "indicas",
  "dime",
  "tiene",
  "tienen",
  "cual",
  "cuales",
]);

export class ChatbotService {
  private semantic = new SemanticServiceClient();
  private documents = AppDataSource.getRepository(DocumentEntity);

  async consultar(pregunta: string): Promise<ChatbotResponse> {
    const terms = this.extractTerms(pregunta);
    const fuentes = await this.enrichSources(
      this.selectSources(await this.semantic.search(pregunta, 12)),
      pregunta,
    );

    if (fuentes.length === 0) {
      const respuestaDirecta =
        "No encontre informacion documental suficiente para responder con seguridad.";
      const puntos = [
        "Verifica que el PDF ya aparezca como Disponible en la biblioteca documental.",
        "Si el documento es escaneado, revisa que la imagen sea clara y que el OCR este funcionando.",
      ];

      return {
        respuesta: this.composeResponse(respuestaDirecta, puntos, null, null),
        respuesta_directa: respuestaDirecta,
        resumen: respuestaDirecta,
        puntos,
        tabla: null,
        aclaracion: null,
        fragmentos: [],
        fuentes: [],
      };
    }

    const intent = this.classifyIntent(pregunta);

    if (intent === "socio_lookup") {
      const lookupTable = await this.buildSocioLookupTable(pregunta, fuentes);
      const respuestaDirecta = lookupTable
        ? this.buildSocioLookupDirectAnswer(lookupTable)
        : "No encontre una coincidencia clara para esa persona en la nomina de socios indexada.";
      const aclaracion = lookupTable && lookupTable.rows.length > 1
        ? "Hay mas de una coincidencia posible. Revisa el nombre completo para confirmar cual corresponde."
        : null;

      return {
        respuesta: this.composeResponse(respuestaDirecta, [], lookupTable, aclaracion),
        respuesta_directa: respuestaDirecta,
        resumen: respuestaDirecta,
        puntos: [],
        tabla: lookupTable,
        aclaracion,
        fragmentos: [],
        fuentes: lookupTable ? this.sourceCards(fuentes, lookupTable) : this.sourceCards(fuentes),
      };
    }

    const socioTable = intent === "socio_list"
      ? await this.buildSocioTable(fuentes)
      : null;
    const identifierResponse = socioTable ? null : await this.buildIdentifierResponse(pregunta, fuentes);
    if (identifierResponse) {
      return {
        respuesta: this.composeResponse(identifierResponse.respuestaDirecta, [], null, null),
        respuesta_directa: identifierResponse.respuestaDirecta,
        resumen: identifierResponse.respuestaDirecta,
        puntos: [],
        tabla: null,
        aclaracion: null,
        fragmentos: this.fragmentSources(identifierResponse.fuentes),
        fuentes: this.sourceCards(identifierResponse.fuentes),
      };
    }

    const table = socioTable ?? (this.shouldBuildTable(pregunta) ? this.buildTable(fuentes, terms) : null);
    const puntos = socioTable
      ? this.buildSocioSummaryPoints(socioTable, fuentes)
      : this.buildPoints(pregunta, fuentes, table);
    const respuestaDirecta = socioTable
      ? this.buildSocioDirectAnswer(socioTable, fuentes)
      : this.buildDirectAnswer(pregunta, puntos, fuentes, table);
    const aclaracion = this.buildClarification(fuentes, puntos.length > 0);

    return {
      respuesta: this.composeResponse(respuestaDirecta, puntos, table, aclaracion),
      respuesta_directa: respuestaDirecta,
      resumen: respuestaDirecta,
      puntos,
      tabla: table,
      aclaracion,
      fragmentos: this.fragmentSources(fuentes),
      fuentes: this.sourceCards(fuentes, table),
    };
  }

  private selectSources(sources: SemanticSource[]) {
    const selected: SemanticSource[] = [];
    const seen = new Set<string>();

    for (const source of sources) {
      const content = this.clean(source.content);
      const quality = source.quality ?? this.textQuality(content);
      if (content.length < 40 || quality < 0.38) continue;

      const key = `${source.document_id ?? source.document_name}|${source.page_number}|${source.chunk_index ?? ""}|${content.slice(0, 120)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      selected.push({
        ...source,
        content,
        quality,
        score:
          typeof source.score === "number"
            ? source.score
            : typeof source.distance === "number"
              ? Math.max(0, 1 - source.distance)
              : 0.35,
      });

      if (selected.length >= 6) break;
    }

    return selected;
  }

  private async enrichSources(sources: SemanticSource[], pregunta: string) {
    const filenames = [...new Set(sources.map((source) => source.document_name))];
    const documents = filenames.length
      ? await this.documents.find({ where: { filename: In(filenames) } })
      : [];
    const byName = new Map(documents.map((document) => [document.filename, document]));

    return sources.map((source) => {
      const document = byName.get(source.document_name);
      const documentId = source.document_id ?? document?.id;
      const excerpt = this.bestExcerpt(source.content, pregunta);

      return {
        ...source,
        document_id: documentId,
        excerpt,
        preview_url: documentId ? `/documentos/public/${documentId}/ver` : undefined,
        page_preview_url: documentId
          ? `/documentos/public/${documentId}/paginas/${source.page_number}/preview`
          : undefined,
      };
    });
  }

  private buildPoints(pregunta: string, fuentes: SemanticSource[], table: ChatTable | null) {
    const terms = this.extractTerms(pregunta);
    const candidates: CandidatePoint[] = [];

    for (const fuente of fuentes) {
      const distanceScore =
        typeof fuente.score === "number"
          ? fuente.score
          : typeof fuente.distance === "number"
            ? Math.max(0, 1 - fuente.distance)
            : 0.35;

      for (const sentence of this.splitSentences(fuente.content)) {
        const point = this.tidyPoint(sentence);
        if (point.length < 36) continue;

        const normalized = this.normalizeForSearch(point);
        const termHits = terms.filter((term) => normalized.includes(term)).length;
        const domainHits = [...DOMAIN_WORDS].filter((term) => normalized.includes(term)).length;
        const quality = this.textQuality(point);

        if (quality < 0.48) continue;
        if (terms.length > 0 && termHits === 0 && domainHits === 0) continue;

        candidates.push({
          text: point,
          source: fuente,
          score: termHits * 2.8 + domainHits * 0.55 + quality * 2 + distanceScore,
        });
      }
    }

    const selected = this.pickBestPoints(candidates);
    if (selected.length > 0) return selected;

    if (table?.rows.length) {
      return table.rows.slice(0, 3).map((row) => `${row[0]}: ${row[1]}.`);
    }

    return fuentes.slice(0, 3).map((source) => source.excerpt ?? this.truncate(source.content, 180));
  }

  private pickBestPoints(candidates: CandidatePoint[]) {
    const selected: string[] = [];
    const seen = new Set<string>();

    for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
      const key = this.normalizeForSearch(candidate.text).slice(0, 120);
      if (seen.has(key)) continue;
      seen.add(key);
      selected.push(candidate.text);
      if (selected.length >= 5) break;
    }

    return selected;
  }

  private shouldBuildTable(pregunta: string) {
    return this.extractTerms(pregunta).some((term) => TABLE_TERMS.has(term));
  }

  private buildTable(fuentes: SemanticSource[], terms: string[]): ChatTable | null {
    const rows: string[][] = [];
    const seen = new Set<string>();

    for (const source of fuentes) {
      const excerpt = source.excerpt ?? this.bestExcerpt(source.content, terms.join(" "));
      const topic = this.tableTopic(excerpt, terms);
      const key = `${topic}|${excerpt.slice(0, 90)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push([
        topic,
        this.truncate(excerpt.replace(/[.!?]$/, ""), 170),
        `Pag. ${source.page_number} | ${source.document_name}`,
      ]);

      if (rows.length >= 5) break;
    }

    if (rows.length === 0) return null;
    return {
      columns: ["Tema", "Detalle", "Fuente"],
      rows,
      kind: "default",
    };
  }

  private classifyIntent(pregunta: string): ChatIntent {
    if (this.isSocioLookupQuery(pregunta)) return "socio_lookup";
    if (this.isSocioListQuery(pregunta)) return "socio_list";
    return "general_document_query";
  }

  private isSocioLookupQuery(pregunta: string) {
    const normalized = this.normalizeForSearch(pregunta);
    const asksForCedula = /\b(cedula|cedulas|identificacion|identidad)\b/.test(normalized);
    const asksForSocioNumber =
      /\b(numero|numeros)\b/.test(normalized) &&
      /\bsocios?\b/.test(normalized) &&
      !/\b(memorando|oficio|acuerdo|ministerial|resolucion|documento)\b/.test(normalized);

    return (asksForCedula || asksForSocioNumber) && this.extractLookupTerms(pregunta).length > 0;
  }

  private extractLookupTerms(text: string) {
    return [
      ...new Set(
        this.normalizeForSearch(text)
          .split(/[^a-z0-9]+/)
          .filter(
            (word) =>
              word.length >= 3 &&
              !STOP_WORDS.has(word) &&
              !LOOKUP_STOP_WORDS.has(word),
          ),
      ),
    ];
  }

  private isSocioListQuery(pregunta: string) {
    const normalized = this.normalizeForSearch(pregunta);
    return (
      /\bsocios?\b/.test(normalized) &&
      /\b(lista|listado|nomina|nombres|integrantes|quienes|todos|darme|dame|puedes)\b/.test(
        normalized,
      )
    );
  }

  private async buildSocioLookupTable(
    pregunta: string,
    fuentes: SemanticSource[],
  ): Promise<ChatTable | null> {
    const terms = this.extractLookupTerms(pregunta);
    const socios = await this.loadSociosFromSources(fuentes);
    if (terms.length === 0 || socios.length === 0) return null;

    const matches = this.rankSocioMatches(socios, terms).slice(0, 3);
    if (matches.length === 0) return null;

    return {
      kind: "socio_lookup",
      caption: matches.length === 1 ? "Socio encontrado" : "Coincidencias encontradas",
      columns: ["Socio", "Cedula", "Fuente"],
      rows: matches.map(({ socio }) => [
        socio.name,
        socio.cedula || "No legible",
        `Pag. ${socio.page} | ${socio.documentName}`,
      ]),
    };
  }

  private rankSocioMatches(socios: SocioRecord[], terms: string[]) {
    const requiredHits = terms.length >= 2 ? 2 : 1;

    return socios
      .map((socio) => {
        const normalizedName = this.normalizeForSearch(socio.name);
        const nameWords = normalizedName
          .split(/[^a-z0-9]+/)
          .filter((word) => word.length >= 3);
        let hits = 0;
        let score = 0;

        for (const term of terms) {
          let termScore = 0;
          if (nameWords.includes(term)) {
            termScore = 5;
          } else if (nameWords.some((word) => word.startsWith(term) || term.startsWith(word))) {
            termScore = 3;
          } else if (normalizedName.includes(term)) {
            termScore = 1;
          }

          if (termScore > 0) {
            hits += 1;
            score += termScore;
          }
        }

        if (hits === terms.length) {
          score += 4;
        }

        return { socio, hits, score };
      })
      .filter((match) => match.hits >= requiredHits)
      .sort((a, b) => b.score - a.score || a.socio.number - b.socio.number);
  }

  private async buildIdentifierResponse(
    pregunta: string,
    fuentes: SemanticSource[],
  ): Promise<IdentifierResponse | null> {
    const normalized = this.normalizeForSearch(pregunta);
    const wantsDocumentNumber =
      /\b(numero|numeros|nro|no)\b/.test(normalized) &&
      /\b(memorando|oficio|acuerdo|ministerial|resolucion)\b/.test(normalized);
    if (!wantsDocumentNumber) return null;

    const expandedSources = await this.expandSourcePages(fuentes);
    const identifierType = normalized.includes("memorando")
      ? "memorando"
      : normalized.includes("oficio")
        ? "oficio"
        : normalized.includes("acuerdo") || normalized.includes("ministerial")
          ? "acuerdo"
          : "resolucion";

    for (const source of expandedSources) {
      const mainValue = this.extractDocumentIdentifier(source.content, identifierType);
      if (!mainValue) continue;

      const agreementValue =
        identifierType === "memorando"
          ? this.extractDocumentIdentifier(source.content, "acuerdo")
          : null;
      const label = this.identifierLabel(identifierType);
      const respuestaDirecta =
        identifierType === "memorando" && agreementValue
          ? `El numero del memorando es ${mainValue}. Esta relacionado con el Acuerdo Ministerial No. ${agreementValue}.`
          : `El numero del ${label} es ${mainValue}.`;

      return {
        respuestaDirecta,
        fuentes: [
          {
            ...source,
            content: this.truncate(source.content, 700),
            excerpt: agreementValue
              ? `${this.capitalize(label)}: ${mainValue}. Acuerdo Ministerial: ${agreementValue}.`
              : `${this.capitalize(label)}: ${mainValue}.`,
          },
        ],
      };
    }

    return null;
  }

  private async expandSourcePages(fuentes: SemanticSource[]) {
    const documentNames = [...new Set(fuentes.map((source) => source.document_name))];
    const pageNumbers = [...new Set(fuentes.map((source) => source.page_number))];
    if (documentNames.length === 0 || pageNumbers.length === 0) return fuentes;

    const rows = (await AppDataSource.query(
      `
      SELECT
        nombre_documento AS document_name,
        numero_pagina AS page_number,
        string_agg(contenido, ' ' ORDER BY indice_fragmento) AS content
      FROM fragmentos_documento
      WHERE nombre_documento = ANY($1)
        AND numero_pagina = ANY($2)
      GROUP BY nombre_documento, numero_pagina
      `,
      [documentNames, pageNumbers],
    )) as Array<{ document_name: string; page_number: number; content: string }>;
    const pageText = new Map(rows.map((row) => [`${row.document_name}|${row.page_number}`, this.clean(row.content)]));

    return fuentes.map((source) => {
      const content = pageText.get(`${source.document_name}|${source.page_number}`);
      return content ? { ...source, content } : source;
    });
  }

  private extractDocumentIdentifier(
    text: string,
    type: "memorando" | "oficio" | "acuerdo" | "resolucion",
  ) {
    const patterns = {
      memorando: [
        /\bMemorando\s+N(?:ro|o)\.?\s*[-:]?\s*([A-Z0-9][A-Z0-9.\-/\s]{6,90}?)(?=\s+de\s+\d{1,2}\s+de|\s*,|\s+suscrit|\s+quien|\.)/i,
      ],
      oficio: [
        /\bOficio\s+N(?:ro|o)\.?\s*[-:]?\s*([A-Z0-9][A-Z0-9.\-/\s]{6,80}?)(?=\s|$)/i,
      ],
      acuerdo: [
        /\bACUERDO\s+MINISTERIAL\s+N(?:O|o|ro)?\.?\s*[-:]?\s*([0-9][A-Z0-9.\-/\s]{5,60}?)(?=\s+de\s+la|\s*,|\s+para|\s|$)/i,
        /\bAcuerdo\s+Ministerial\s*#?\s*([0-9][A-Z0-9.\-/\s]{5,60}?)(?=\s|$)/i,
      ],
      resolucion: [
        /\bResoluci[oó]n\s+N(?:ro|o)?\.?\s*[-:]?\s*([A-Z0-9][A-Z0-9.\-/\s]{6,80}?)(?=\s|$)/i,
      ],
    }[type];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      const value = match?.[1] ? this.cleanIdentifier(match[1]) : "";
      if (value) return value;
    }

    return null;
  }

  private cleanIdentifier(value: string) {
    const cleaned = this.clean(value)
      .replace(/\s*-\s*/g, "-")
      .replace(/\s+/g, "")
      .replace(/[.,;:]+$/g, "");
    return /^[A-Z0-9][A-Z0-9./-]{5,90}$/i.test(cleaned) ? cleaned : "";
  }

  private identifierLabel(type: "memorando" | "oficio" | "acuerdo" | "resolucion") {
    if (type === "acuerdo") return "acuerdo ministerial";
    if (type === "resolucion") return "resolucion";
    return type;
  }

  private async buildSocioTable(fuentes: SemanticSource[]): Promise<ChatTable | null> {
    const filenames = [
      ...new Set(
        fuentes
          .map((source) => source.document_name)
          .filter((name) => this.normalizeForSearch(name).includes("socio")),
      ),
    ];
    if (filenames.length === 0) return null;

    const fragments = (await AppDataSource.query(
      `
      SELECT
        nombre_documento AS document_name,
        numero_pagina AS page_number,
        indice_fragmento AS chunk_index,
        contenido AS content
      FROM fragmentos_documento
      WHERE nombre_documento = ANY($1)
      ORDER BY nombre_documento, numero_pagina, indice_fragmento
      `,
      [filenames],
    )) as Array<{
      document_name: string;
      page_number: number;
      chunk_index: number;
      content: string;
    }>;

    const cedulasByPage = new Map<string, string[]>();
    const byNumber = new Map<
      number,
      { number: number; name: string; cedula: string; page: number; documentName: string }
    >();

    for (const fragment of fragments) {
      const pageKey = `${fragment.document_name}|${fragment.page_number}`;
      const cedulas = this.extractCedulas(fragment.content);
      if (cedulas.length) {
        cedulasByPage.set(pageKey, [...(cedulasByPage.get(pageKey) ?? []), ...cedulas]);
      }
    }

    for (const fragment of fragments) {
      const pageKey = `${fragment.document_name}|${fragment.page_number}`;
      const cedulas = cedulasByPage.get(pageKey) ?? [];
      for (const item of this.extractSocioNames(fragment.content)) {
        const cedula = cedulas[item.number - this.firstNumberForPage(fragment.page_number)] ?? "";
        const previous = byNumber.get(item.number);
        if (!previous || item.name.length > previous.name.length) {
          byNumber.set(item.number, {
            number: item.number,
            name: item.name,
            cedula,
            page: fragment.page_number,
            documentName: fragment.document_name,
          });
        }
      }
    }

    const socios = [...byNumber.values()]
      .filter((item) => item.number >= 1 && item.number <= 250)
      .sort((a, b) => a.number - b.number);

    if (socios.length === 0) return null;

    return {
      kind: "socios",
      caption: `Nómina de socios encontrada (${socios.length} registros)`,
      columns: ["No.", "Socio", "Cedula"],
      rows: socios.map((socio) => [
        String(socio.number),
        socio.name,
        socio.cedula || "No legible",
        `Pag. ${socio.page} | ${socio.documentName}`,
      ]),
    };
  }

  private async loadSociosFromSources(fuentes: SemanticSource[]): Promise<SocioRecord[]> {
    const filenames = [
      ...new Set(
        fuentes
          .map((source) => source.document_name)
          .filter((name) => this.normalizeForSearch(name).includes("socio")),
      ),
    ];

    const fragments = (await AppDataSource.query(
      filenames.length
        ? `
      SELECT
        nombre_documento AS document_name,
        numero_pagina AS page_number,
        indice_fragmento AS chunk_index,
        contenido AS content
      FROM fragmentos_documento
      WHERE nombre_documento = ANY($1)
      ORDER BY nombre_documento, numero_pagina, indice_fragmento
      `
        : `
      SELECT
        nombre_documento AS document_name,
        numero_pagina AS page_number,
        indice_fragmento AS chunk_index,
        contenido AS content
      FROM fragmentos_documento
      WHERE lower(nombre_documento) LIKE '%socio%'
      ORDER BY nombre_documento, numero_pagina, indice_fragmento
      `,
      filenames.length ? [filenames] : [],
    )) as Array<{
      document_name: string;
      page_number: number;
      chunk_index: number;
      content: string;
    }>;

    const cedulasByPage = new Map<string, string[]>();
    const byNumber = new Map<number, SocioRecord>();

    for (const fragment of fragments) {
      const pageKey = `${fragment.document_name}|${fragment.page_number}`;
      const cedulas = this.extractCedulas(fragment.content);
      if (cedulas.length) {
        cedulasByPage.set(pageKey, [...(cedulasByPage.get(pageKey) ?? []), ...cedulas]);
      }
    }

    for (const fragment of fragments) {
      const pageKey = `${fragment.document_name}|${fragment.page_number}`;
      const cedulas = cedulasByPage.get(pageKey) ?? [];
      for (const item of this.extractSocioNames(fragment.content)) {
        const cedula = cedulas[item.number - this.firstNumberForPage(fragment.page_number)] ?? "";
        const previous = byNumber.get(item.number);
        if (!previous || item.name.length > previous.name.length) {
          byNumber.set(item.number, {
            number: item.number,
            name: item.name,
            cedula,
            page: fragment.page_number,
            documentName: fragment.document_name,
          });
        }
      }
    }

    return [...byNumber.values()]
      .filter((item) => item.number >= 1 && item.number <= 250)
      .sort((a, b) => a.number - b.number);
  }

  private extractSocioNames(text: string) {
    const usable = this.clean(text)
      .replace(/\bFundada el 10 de Mayo de 2008\b/gi, " ")
      .replace(/\bLista de asistencia\b/gi, " ")
      .replace(/\bCedula\b.*$/i, " ");
    const matches: Array<{ number: number; start: number; markerStart: number }> = [];
    const marker = /(^|[^0-9])(\d{1,3})\s*[\|\\\]lI]?\s*(?=[A-ZÁÉÍÓÚÑ])/g;
    let match: RegExpExecArray | null;

    while ((match = marker.exec(usable)) !== null) {
      const number = Number(match[2]);
      const markerStart = match.index + match[1].length;
      matches.push({
        number,
        markerStart,
        start: markerStart + match[0].slice(match[1].length).length,
      });
    }

    const socios: Array<{ number: number; name: string }> = [];
    for (let index = 0; index < matches.length; index += 1) {
      const current = matches[index];
      const next = matches[index + 1];
      const rawName = usable.slice(current.start, next?.markerStart ?? usable.length);
      const name = this.cleanSocioName(rawName);
      if (this.isValidSocioName(name)) {
        socios.push({ number: current.number, name });
      }
    }

    return socios;
  }

  private extractCedulas(text: string) {
    const cedulaSection = this.clean(text).split(/\bCedula\b/i)[1];
    if (!cedulaSection) return [];

    const tokens = cedulaSection.match(/[0-9O]+/gi) ?? [];
    const cedulas: string[] = [];
    let pending = "";

    for (const token of tokens) {
      const cleanToken = token.replace(/O/gi, "0");

      if (pending) {
        const merged = `${pending}${cleanToken}`;
        if (merged.length >= 10) {
          cedulas.push(merged.slice(0, 10));
          pending = "";
        } else {
          pending = merged;
        }
        continue;
      }

      if (cleanToken.length >= 10) {
        cedulas.push(cleanToken.slice(0, 10));
      } else if (cleanToken.length >= 4) {
        pending = cleanToken;
      }
    }

    return cedulas.filter((value, index, all) => value.length === 10 && all.indexOf(value) === index);
  }

  private cleanSocioName(text: string) {
    return this.clean(text)
      .replace(/\bFundada\b.*$/i, "")
      .replace(/\bLista de asistencia\b.*$/i, "")
      .replace(/\bCedula\b.*$/i, "")
      .replace(/\bApellidos y Nombres\b/gi, "")
      .replace(/\bN[oó]mina de socios\b/gi, "")
      .replace(/\bAsociaci[oó]n de Poductores Agropecuarios\b/gi, "")
      .replace(/\bAsociaci[oó]n de Productores Agropecuarios\b/gi, "")
      .replace(/\bCant[oó]n Daule\b/gi, "")
      .replace(/\bProvincia del Guayas\b/gi, "")
      .replace(/\bRcto\.?\b/gi, "")
      .replace(/\bAcuerdo Ministerial\b.*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  private isValidSocioName(name: string) {
    const words = name.split(/\s+/).filter(Boolean);
    if (name.length < 8 || name.length > 85 || words.length < 2) return false;
    if (/\d{4,}/.test(name)) return false;
    return words.filter((word) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(word)).length >= 2;
  }

  private firstNumberForPage(page: number) {
    if (page <= 1) return 1;
    if (page === 2) return 26;
    if (page === 3) return 51;
    return 1;
  }

  private buildSocioSummaryPoints(table: ChatTable, fuentes: SemanticSource[]) {
    const source = fuentes.find((item) => this.normalizeForSearch(item.document_name).includes("socio"));
    const first = table.rows[0]?.[1];
    const last = table.rows[table.rows.length - 1]?.[1];
    const points = [
      `La nómina contiene ${table.rows.length} socios registrados.`,
      first && last ? `El listado inicia con ${first} y finaliza con ${last}.` : "",
    ].filter(Boolean);

    if (source) {
      points.push(`La información fue tomada de ${source.document_name}; puedes abrir la fuente para revisar la página original.`);
    }

    return points;
  }

  private buildSocioDirectAnswer(table: ChatTable, fuentes: SemanticSource[]) {
    const sourceCount = new Set(fuentes.map((source) => source.document_name)).size;
    return `Sí. Encontré ${table.rows.length} socios en la nómina institucional${sourceCount ? `, respaldados por ${sourceCount} documento${sourceCount === 1 ? "" : "s"}` : ""}. Te los organizo en una lista legible con número, nombre y cédula cuando el OCR la pudo leer.`;
  }

  private buildSocioLookupDirectAnswer(table: ChatTable) {
    if (table.rows.length === 1) {
      const [name, cedula] = table.rows[0];
      return `La cedula de ${name} es ${cedula}.`;
    }

    return `Encontre ${table.rows.length} coincidencias posibles en la nomina de socios.`;
  }

  private buildDirectAnswer(
    pregunta: string,
    puntos: string[],
    fuentes: SemanticSource[],
    table: ChatTable | null,
  ) {
    const topic = this.topicFromQuestion(pregunta);
    const sourceCount = new Set(fuentes.map((source) => source.document_name)).size;

    if (table?.rows.length) {
      return `Sobre ${topic}, encontre informacion en ${sourceCount} documento${sourceCount === 1 ? "" : "s"}. La organice por tema para que puedas revisar el detalle y la pagina de respaldo.`;
    }

    if (puntos.length > 0) {
      const mainPoint = this.lowercaseFirst(puntos[0].replace(/[.!?]$/, ""));
      return `Sobre ${topic}, los documentos indican principalmente que ${mainPoint}.`;
    }

    return `Encontre documentos relacionados con ${topic}, pero el texto recuperado no permite construir una explicacion completa.`;
  }

  private splitSentences(text: string) {
    const normalized = this.clean(text);
    const sentences = normalized.match(/[^.!?;:]+[.!?;:]?/g) ?? [normalized];
    return sentences.flatMap((sentence) => {
      const cleanSentence = sentence.trim();
      if (cleanSentence.length <= 260) return [cleanSentence];
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

    if (point.length > 240) {
      point = `${point.slice(0, 237).trim()}...`;
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
    if (/^[A-Z]{3,8}$/.test(cleanWord)) return true;
    if (!/[aeiouAEIOU]/.test(cleanWord)) return false;
    const symbols = cleanWord.replace(/[A-Za-z0-9/-]/g, "");
    return symbols.length <= 1;
  }

  private buildClarification(fuentes: SemanticSource[], hasReadablePoints: boolean) {
    const hasLowQualitySource = fuentes.some((fuente) => (fuente.quality ?? 1) < 0.62);
    if (!hasReadablePoints || hasLowQualitySource) {
      return "Algunos documentos parecen provenir de escaneos u OCR. Revisa la fuente si necesitas confirmar el texto exacto.";
    }

    return null;
  }

  private composeResponse(
    respuestaDirecta: string,
    puntos: string[],
    table: ChatTable | null,
    aclaracion: string | null,
  ) {
    const lines = [respuestaDirecta];
    if (puntos.length) {
      lines.push("", ...puntos.map((point) => `- ${point}`));
    }
    if (table?.rows.length) {
      lines.push("", ...table.rows.map((row) => `- ${row[0]}: ${row[1]} (${row[2]})`));
    }
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

  private sourceCards(fuentes: SemanticSource[], table?: ChatTable | null) {
    if (table?.kind === "socio_lookup") {
      return this.socioLookupSourceCards(fuentes, table);
    }

    const cards: SemanticSource[] = [];
    const seen = new Set<string>();

    for (const fuente of fuentes) {
      const key = `${fuente.document_id ?? fuente.document_name}|${fuente.page_number}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({
        ...fuente,
        content: this.truncate(fuente.content, 420),
        excerpt: this.sourceExcerpt(fuente, table),
      });
      if (cards.length >= 5) break;
    }

    return cards;
  }

  private socioLookupSourceCards(fuentes: SemanticSource[], table: ChatTable) {
    const cards: SemanticSource[] = [];
    const seen = new Set<string>();

    for (const row of table.rows) {
      const [name, cedula, sourceLabel] = row;
      const match = sourceLabel?.match(/^Pag\.\s*(\d+)\s*\|\s*(.+)$/i);
      if (!match) continue;

      const page = Number(match[1]);
      const documentName = match[2];
      const base =
        fuentes.find(
          (source) => source.document_name === documentName && source.page_number === page,
        ) ?? fuentes.find((source) => source.document_name === documentName);
      const documentId = base?.document_id;
      const key = `${documentId ?? documentName}|${page}`;
      if (seen.has(key)) continue;
      seen.add(key);

      cards.push({
        ...(base ?? fuentes[0] ?? {}),
        document_id: documentId,
        document_name: documentName,
        page_number: page,
        content: `Registro encontrado: ${name}. Cedula: ${cedula}.`,
        excerpt: `Registro encontrado: ${name}. Cedula: ${cedula}.`,
        preview_url: documentId ? `/documentos/public/${documentId}/ver` : base?.preview_url,
        page_preview_url: documentId
          ? `/documentos/public/${documentId}/paginas/${page}/preview`
          : base?.page_preview_url,
      });
    }

    return cards;
  }

  private sourceExcerpt(fuente: SemanticSource, table?: ChatTable | null) {
    if (table?.kind === "socio_lookup") {
      const pagePrefix = `Pag. ${fuente.page_number} |`;
      const row = table.rows.find((item) => item[2]?.startsWith(pagePrefix));
      if (row) return `Registro encontrado: ${row[0]}. Cedula: ${row[1]}.`;
    }

    if (table?.kind === "socios") {
      const pagePrefix = `Pag. ${fuente.page_number} |`;
      const names = table.rows
        .filter((row) => row[3]?.startsWith(pagePrefix))
        .slice(0, 4)
        .map((row) => `${row[0]}. ${row[1]}`);
      if (names.length) {
        return `Página ${fuente.page_number} de la nómina de socios. Incluye, entre otros: ${names.join("; ")}.`;
      }
    }

    return fuente.excerpt ?? this.truncate(fuente.content, 220);
  }

  private bestExcerpt(text: string, pregunta: string) {
    const terms = this.extractTerms(pregunta);
    const sentences = this.splitSentences(text)
      .map((sentence) => this.tidyPoint(sentence))
      .filter((sentence) => sentence.length >= 32);

    const best = sentences
      .map((sentence) => {
        const normalized = this.normalizeForSearch(sentence);
        const hits = terms.filter((term) => normalized.includes(term)).length;
        return { sentence, score: hits * 2 + this.textQuality(sentence) };
      })
      .sort((a, b) => b.score - a.score)[0]?.sentence;

    return this.truncate(best || this.clean(text), 260);
  }

  private tableTopic(text: string, terms: string[]) {
    const normalized = this.normalizeForSearch(text);
    const matched = terms.find((term) => normalized.includes(term));
    if (matched) return this.capitalize(matched);
    if (normalized.includes("socio")) return "Socios";
    if (normalized.includes("rol")) return "Roles";
    if (normalized.includes("directiva")) return "Directiva";
    if (normalized.includes("document")) return "Documento";
    return "Hallazgo";
  }

  private topicFromQuestion(question: string) {
    const terms = this.extractTerms(question).filter((term) => !["opinas", "opinion"].includes(term));
    if (terms.length === 0) return "tu consulta";
    return terms.slice(0, 3).join(", ");
  }

  private lowercaseFirst(text: string) {
    return text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : text;
  }

  private capitalize(text: string) {
    return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
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
      (char) => /[A-Za-z0-9]/.test(char) || ".,;:!?()[]/-".includes(char),
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

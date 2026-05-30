from app.application.exceptions import ApplicationError
from app.application.ports.services import LlmProviderPort, RagRetrieverPort


class ChatbotApplicationService:
    def __init__(self, retriever: RagRetrieverPort, llm_provider: LlmProviderPort):
        self.retriever = retriever
        self.llm_provider = llm_provider

    def consultar(self, pregunta: str) -> dict:
        context_chunks = self.retriever.retrieve_context(pregunta)
        context_text = "\n\n".join(
            f"--- Fragmento Origen (Pag {c['page_number']}, {c['document_name']}) ---\n{c['content']}"
            for c in context_chunks
        )

        has_sufficient_context = any(c["content"].strip() for c in context_chunks)

        if not has_sufficient_context or len(context_text.strip()) < 50:
            system_prompt = (
                "Eres el asistente institucional de la 'Asociacion Agricola 10 de Mayo'.\n\n"
                "El usuario ha realizado una consulta que no tiene suficiente informacion en los "
                "documentos institucionales indexados. Debes informar que no se dispone de informacion "
                "institucional especifica, ofrecer orientacion general y sugerir consultar a la directiva."
            )
            human_prompt = f"Consulta del socio: {pregunta}"
        else:
            system_prompt = (
                "Eres el asistente institucional de la 'Asociacion Agricola 10 de Mayo'. "
                "Tu trabajo es ayudar a los socios respondiendo solo con la verdad.\n\n"
                "REGLA DE ORO:\n"
                "Usa UNICAMENTE el contexto de los documentos proporcionados para responder. "
                "Si la respuesta no esta clara o no se deduce de los documentos dados, debes decir: "
                "'No encontre informacion oficial sobre esto en los estatutos o actas cargadas en el sistema'. "
                "No inventes, no alucines y no des leyes de otros paises."
            )
            human_prompt = (
                f"Contexto institucional:\n{context_text}\n\n"
                f"Pregunta del socio: {pregunta}"
            )

        try:
            respuesta = self.llm_provider.invoke(system_prompt, human_prompt)
        except ValueError as exc:
            raise ApplicationError(status_code=400, detail=str(exc))
        except Exception as exc:
            raise ApplicationError(
                status_code=500,
                detail=f"Error al calcular respuesta: {str(exc)}",
            )

        return {"respuesta": respuesta, "fuentes": context_chunks}

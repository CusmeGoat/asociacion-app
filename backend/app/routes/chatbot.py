from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from app.db.database import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.core.rag_retriever import retrieve_context
from app.core.config import LLM_PROVIDER, GROQ_API_KEY, OLLAMA_BASE_URL

from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

class ChatRequest(BaseModel):
    pregunta: str

class FuenteRAG(BaseModel):
    content: str
    page_number: int
    document_name: str

class ChatResponse(BaseModel):
    respuesta: str
    fuentes: List[FuenteRAG]

def get_llm():
    if LLM_PROVIDER == "groq":
        if not GROQ_API_KEY or GROQ_API_KEY == "pon_tu_clave_aqui":
            raise ValueError("Falta configurar tu GROQ_API_KEY real en el archivo .env")
        return ChatGroq(model="llama-3.1-8b-instant", api_key=GROQ_API_KEY)
    elif LLM_PROVIDER == "ollama":
        return ChatOllama(model="qwen2.5:7b", base_url=OLLAMA_BASE_URL)
    else:
        raise ValueError("Proveedor LLM_PROVIDER erróneo en el archivo .env")

@router.post("/consultar", response_model=ChatResponse)
def consultar_chatbot(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Recuperación Vecotrial (RAG)
    context_chunks = retrieve_context(req.pregunta, db)
    
    # Armar texto final para inyectar en LangChain
    context_text = "\n\n".join(
        f"--- Fragmento Origen (Pág {c['page_number']}, {c['document_name']}) ---\n{c['content']}" 
        for c in context_chunks
    )
    
    # 2. Control sistemático Anti-Alucinaciones
    system_prompt = (
        "Eres el asistente institucional de la 'Asociación Agrícola 10 de Mayo'."
        "Tu trabajo es ayudar a los socios de la organización respondiendo solo con la verdad.\n\n"
        "REGLA DE ORO:\n"
        "Usa ÚNICAMENTE el contexto de los documentos proporcionados para responder a la pregunta. "
        "Si la respuesta no está clara o no se deduce de los documentos dados, debes decir literalmente: "
        "'No encontré información oficial sobre esto en los estatutos o actas cargadas en el sistema'. "
        "No inventes, no alucines y no des leyes de otros países."
    )
    
    human_prompt = f"Contexto institucional:\n{context_text}\n\nPregunta del socio: {req.pregunta}"
    
    # 3. Llamado al LLM con la decisión de fábrica
    try:
        llm = get_llm()
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ])
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al calcular respuesta: {str(e)}")
        
    return ChatResponse(
        respuesta=response.content,
        fuentes=context_chunks
    )

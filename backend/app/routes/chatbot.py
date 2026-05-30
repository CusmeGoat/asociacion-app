from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.application.services.chatbot_service import ChatbotApplicationService
from app.core.deps import get_current_user
from app.db.database import get_db
from app.infrastructure.services import LangChainLlmProvider, SqlAlchemyRagRetriever
from app.models.user import User

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


def build_chatbot_service(db: Session) -> ChatbotApplicationService:
    return ChatbotApplicationService(
        retriever=SqlAlchemyRagRetriever(db),
        llm_provider=LangChainLlmProvider(),
    )


@router.post("/consultar", response_model=ChatResponse)
def consultar_chatbot(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return build_chatbot_service(db).consultar(req.pregunta)

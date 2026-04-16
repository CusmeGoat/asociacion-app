from datetime import datetime
from pydantic import BaseModel, ConfigDict

class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_path: str
    uploaded_by_id: int
    uploader_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel, Field
from typing import List, Literal


class TaskSchema(BaseModel):
    id: str
    description: str
    priority: Literal["low", "medium", "high"]
    dependencies: List[str] = Field(default_factory=list)
    status: Literal["ready", "blocked"]


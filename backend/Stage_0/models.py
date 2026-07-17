from pydantic import BaseModel, field_validator

class InvestigateRequest(BaseModel):
    query: str
    level: str = "flash"

    @field_validator("query")
    @classmethod
    def query_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("query must not be empty")
        return v

class InvestigateResponse(BaseModel):
    investigation_id: str

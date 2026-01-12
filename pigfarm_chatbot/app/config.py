from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

# Get project root directory
PROJECT_ROOT = Path(__file__).parent.parent
ENV_PATH = PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    # Database
    database_url: str
    
    # API Keys
    google_api_key: str
    cohere_api_key: str
    
    # AI Settings
    gemini_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "models/gemini-embedding-001"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    
    # CORS
    frontend_url: str = "http://localhost:3000"
    
    # RAG Settings
    chunk_size: int = 500
    chunk_overlap: int = 50
    vector_search_k: int = 10
    bm25_search_k: int = 10
    rerank_top_k: int = 5
    
    # Session
    session_timeout_minutes: int = 30
    
    # LangSmith (Optional - for observability)
    langchain_tracing_v2: bool = False
    langchain_api_key: str | None = None
    langchain_project: str = "pigfarm-chatbot"
    
    class Config:
        env_file = str(ENV_PATH)
        extra = "ignore"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()

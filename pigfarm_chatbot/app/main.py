from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.config import get_settings
from app.db.database import init_db, close_db
from app.api import chat, documents


settings = get_settings()

# Setup LangSmith tracing if enabled
if settings.langchain_tracing_v2 and settings.langchain_api_key:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project
    print(f"[OK] LangSmith tracing enabled: {settings.langchain_project}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await init_db()
        print("✅ PigFarm Chatbot sẵn sàng!")
    except Exception as e:
        print(f"❌ Lỗi khởi động: {e}")
    yield
    # Shutdown
    await close_db()


app = FastAPI(
    title="PigFarm Chatbot API",
    description="AI Chatbot Agent for Pig Farm Management",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(documents.router, prefix="/documents", tags=["Documents"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "pigfarm-chatbot"}

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from typing import AsyncGenerator

from app.config import get_settings

settings = get_settings()

# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=5,
    max_overflow=10
)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()


async def init_db():
    """Initialize database extensions and tables for chatbot"""
    async with engine.begin() as conn:
        # Enable pgvector extension
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        # Enable pg_trgm for BM25/trigram search
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        
        # Create chat_documents table if not exists
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS chat_documents (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                embedding vector(1536),
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Create HNSW index for vector similarity search
        # 1536 dims is compatible with standard pgvector HNSW limits (<2000)
        # Tuned with m=32, ef_construction=128 for better recall (accuracy)
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_chat_documents_embedding 
            ON chat_documents 
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 32, ef_construction = 128)
        """))
        
        # Create GIN index for full-text search
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_chat_documents_content_fts 
            ON chat_documents 
            USING gin(to_tsvector('english', content))
        """))
        
        # Create trigram index for fuzzy matching
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_chat_documents_content_trgm 
            ON chat_documents 
            USING gin(content gin_trgm_ops)
        """))
        
    print("✅ Database initialized with pgvector and FTS extensions")


async def close_db():
    """Close database connections"""
    await engine.dispose()
    print("✅ Database connections closed")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting database session"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def execute_read_query(query: str) -> list[dict]:
    """Execute a read-only SQL query and return results as list of dicts"""
    # Safety check - only allow SELECT statements
    query_upper = query.strip().upper()
    if not query_upper.startswith("SELECT"):
        raise ValueError("Only SELECT queries are allowed")
    
    # Block dangerous keywords
    dangerous_keywords = ["INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE"]
    for keyword in dangerous_keywords:
        if keyword in query_upper:
            raise ValueError(f"Query contains forbidden keyword: {keyword}")
    
    async with async_session_maker() as session:
        result = await session.execute(text(query))
        columns = result.keys()
        rows = result.fetchall()
        return [dict(zip(columns, row)) for row in rows]

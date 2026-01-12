from sqlalchemy import text
from typing import Optional

from app.db.database import async_session_maker
from app.documents.embedder import get_embedder


class VectorSearch:
    """
    Vector similarity search using pgvector
    Uses cosine similarity for finding semantically similar documents
    """
    
    def __init__(self, top_k: int = 10):
        self.top_k = top_k
        self.embedder = get_embedder()
    
    async def search(self, query: str, top_k: Optional[int] = None) -> list[dict]:
        """
        Search for documents similar to query using vector similarity
        
        Args:
            query: Search query text
            top_k: Number of results to return (overrides default)
        
        Returns:
            List of documents with similarity scores
        """
        k = top_k or self.top_k
        
        # Generate query embedding
        query_embedding = await self.embedder.embed_text(query)
        
        # Format embedding for PostgreSQL
        embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
        
        async with async_session_maker() as session:
            # Cosine similarity search
            # Note: pgvector uses <=> for cosine distance, so we convert to similarity
            # Removed explicit ::vector cast to avoid asyncpg syntax error with bound params
            result = await session.execute(
                text("""
                    SELECT 
                        id,
                        filename,
                        content,
                        chunk_index,
                        metadata,
                        1 - (embedding <=> :embedding) as similarity
                    FROM chat_documents
                    WHERE embedding IS NOT NULL
                    ORDER BY embedding <=> :embedding
                    LIMIT :limit
                """),
                {"embedding": embedding_str, "limit": k}
            )
            
            rows = result.fetchall()
            
            return [
                {
                    "id": row.id,
                    "filename": row.filename,
                    "content": row.content,
                    "chunk_index": row.chunk_index,
                    "metadata": row.metadata,
                    "score": float(row.similarity),
                    "source": "vector"
                }
                for row in rows
            ]
    
    async def search_multi_query(
        self, 
        queries: list[str], 
        top_k_per_query: int = 10
    ) -> list[dict]:
        """
        Search with multiple queries and combine results
        
        Args:
            queries: List of query variations
            top_k_per_query: Results per query
        
        Returns:
            Combined list of documents (may have duplicates)
        """
        all_results = []
        
        for query in queries:
            results = await self.search(query, top_k_per_query)
            all_results.extend(results)
        
        return all_results


# Singleton
_vector_search: Optional[VectorSearch] = None


def get_vector_search() -> VectorSearch:
    global _vector_search
    if _vector_search is None:
        _vector_search = VectorSearch()
    return _vector_search

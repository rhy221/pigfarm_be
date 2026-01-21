from sqlalchemy import text
from typing import Optional

from app.db.database import async_session_maker


class BM25Search:
    """
    BM25-style search using PostgreSQL Full-Text Search (tsvector) 
    and trigram similarity for fuzzy matching
    
    Combines:
    1. Full-text search with ts_rank
    2. Trigram similarity for fuzzy matching
    """
    
    def __init__(self, top_k: int = 10):
        self.top_k = top_k
    
    async def search(self, query: str, top_k: Optional[int] = None) -> list[dict]:
        """
        Search using PostgreSQL full-text search with BM25-like ranking
        
        Args:
            query: Search query text
            top_k: Number of results to return
        
        Returns:
            List of documents with relevance scores
        """
        k = top_k or self.top_k
        
        async with async_session_maker() as session:
            # Combine full-text search rank and trigram similarity
            # This gives us both exact matches and fuzzy matches
            result = await session.execute(
                text("""
                    SELECT 
                        id,
                        filename,
                        content,
                        chunk_index,
                        metadata,
                        (
                            ts_rank(to_tsvector('english', content), plainto_tsquery('english', :query)) * 0.6 +
                            similarity(content, :query) * 0.4
                        ) as score
                    FROM chat_documents
                    WHERE 
                        to_tsvector('english', content) @@ plainto_tsquery('english', :query)
                        OR similarity(content, :query) > 0.1
                    ORDER BY score DESC
                    LIMIT :limit
                """),
                {"query": query, "limit": k}
            )
            
            rows = result.fetchall()
            
            return [
                {
                    "id": row.id,
                    "filename": row.filename,
                    "content": row.content,
                    "chunk_index": row.chunk_index,
                    "metadata": row.metadata,
                    "score": float(row.score),
                    "source": "bm25"
                }
                for row in rows
            ]
    
    async def search_vietnamese(self, query: str, top_k: Optional[int] = None) -> list[dict]:
        """
        Search optimized for Vietnamese text using trigram similarity
        (PostgreSQL FTS doesn't have Vietnamese dictionary by default)
        """
        k = top_k or self.top_k
        
        async with async_session_maker() as session:
            # Use trigram similarity for Vietnamese
            # Also do simple word matching
            result = await session.execute(
                text("""
                    SELECT 
                        id,
                        filename,
                        content,
                        chunk_index,
                        metadata,
                        (
                            similarity(content, :query) * 0.5 +
                            word_similarity(:query, content) * 0.5
                        ) as score
                    FROM chat_documents
                    WHERE 
                        content ILIKE '%' || :query || '%'
                        OR similarity(content, :query) > 0.1
                    ORDER BY score DESC
                    LIMIT :limit
                """),
                {"query": query, "limit": k}
            )
            
            rows = result.fetchall()
            
            return [
                {
                    "id": row.id,
                    "filename": row.filename,
                    "content": row.content,
                    "chunk_index": row.chunk_index,
                    "metadata": row.metadata,
                    "score": float(row.score),
                    "source": "bm25_vi"
                }
                for row in rows
            ]
    
    async def search_multi_query(
        self, 
        queries: list[str], 
        top_k_per_query: int = 10
    ) -> list[dict]:
        """Search with multiple queries"""
        all_results = []
        
        for query in queries:
            # Use Vietnamese-optimized search
            results = await self.search_vietnamese(query, top_k_per_query)
            all_results.extend(results)
        
        return all_results


# Singleton
_bm25_search: Optional[BM25Search] = None


def get_bm25_search() -> BM25Search:
    global _bm25_search
    if _bm25_search is None:
        _bm25_search = BM25Search()
    return _bm25_search

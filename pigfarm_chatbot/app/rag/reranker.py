import cohere
from typing import Optional

from app.config import get_settings

settings = get_settings()


class CohereReranker:
    """
    Cross-encoder reranking using Cohere's rerank API
    Filters and reorders search results for better relevance
    """
    
    def __init__(self, top_k: int = 5):
        self.client = cohere.AsyncClient(api_key=settings.cohere_api_key)
        self.top_k = top_k
        self.model = "rerank-multilingual-v3.0"  # Supports Vietnamese
    
    async def rerank(
        self,
        query: str,
        documents: list[dict],
        top_k: Optional[int] = None
    ) -> list[dict]:
        """
        Rerank documents using Cohere's cross-encoder model
        
        Args:
            query: Original search query
            documents: List of documents from hybrid search
            top_k: Number of top results to return
        
        Returns:
            Reranked documents with relevance scores
        """
        if not documents:
            return []
        
        k = top_k or self.top_k
        
        # Extract content for reranking
        doc_texts = [doc["content"] for doc in documents]
        
        # Call Cohere rerank API
        response = await self.client.rerank(
            model=self.model,
            query=query,
            documents=doc_texts,
            top_n=min(k, len(documents)),
            return_documents=False  # We already have the documents
        )
        
        # Build reranked results
        reranked = []
        for result in response.results:
            doc = documents[result.index].copy()
            doc["rerank_score"] = result.relevance_score
            reranked.append(doc)
        
        return reranked
    
    async def rerank_with_threshold(
        self,
        query: str,
        documents: list[dict],
        threshold: float = 0.3,
        top_k: Optional[int] = None
    ) -> list[dict]:
        """
        Rerank and filter documents below relevance threshold
        
        Args:
            query: Search query
            documents: Documents to rerank
            threshold: Minimum relevance score (0-1)
            top_k: Maximum results to return
        
        Returns:
            Filtered and reranked documents
        """
        reranked = await self.rerank(query, documents, top_k)
        
        # Filter by threshold
        filtered = [
            doc for doc in reranked 
            if doc["rerank_score"] >= threshold
        ]
        
        return filtered


# Singleton
_reranker: Optional[CohereReranker] = None


def get_reranker() -> CohereReranker:
    global _reranker
    if _reranker is None:
        _reranker = CohereReranker(top_k=settings.rerank_top_k)
    return _reranker

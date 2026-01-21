from typing import Optional
from collections import defaultdict

from app.rag.vector_search import get_vector_search, VectorSearch
from app.rag.bm25_search import get_bm25_search, BM25Search
from app.rag.query_transformer import get_query_transformer, QueryTransformer
from app.config import get_settings

settings = get_settings()


class HybridSearch:
    """
    Hybrid search combining Vector Search and BM25 Search
    Uses Reciprocal Rank Fusion (RRF) to combine results
    """
    
    def __init__(
        self,
        vector_k: int = 10,
        bm25_k: int = 10,
        rrf_k: int = 60  # RRF constant, typically 60
    ):
        self.vector_search = get_vector_search()
        self.bm25_search = get_bm25_search()
        self.query_transformer = get_query_transformer()
        self.vector_k = vector_k
        self.bm25_k = bm25_k
        self.rrf_k = rrf_k
    
    async def search(
        self,
        query: str,
        use_query_transformation: bool = True,
        top_k: int = 20
    ) -> list[dict]:
        """
        Perform hybrid search with optional query transformation
        
        Args:
            query: Original user query
            use_query_transformation: Whether to rewrite and expand queries
            top_k: Number of final results after fusion
        
        Returns:
            List of documents ranked by RRF score
        """
        # Step 1: Query Transformation (optional)
        if use_query_transformation:
            transformed = await self.query_transformer.transform(query)
            queries = transformed["variations"]
        else:
            queries = [query]
        
        # Step 2: Parallel search with both methods
        vector_results = await self.vector_search.search_multi_query(
            queries, 
            top_k_per_query=self.vector_k
        )
        
        bm25_results = await self.bm25_search.search_multi_query(
            queries,
            top_k_per_query=self.bm25_k
        )
        
        # Step 3: Reciprocal Rank Fusion
        fused_results = self._reciprocal_rank_fusion(
            vector_results, 
            bm25_results,
            top_k
        )
        
        return fused_results
    
    def _reciprocal_rank_fusion(
        self,
        vector_results: list[dict],
        bm25_results: list[dict],
        top_k: int
    ) -> list[dict]:
        """
        Combine results using Reciprocal Rank Fusion (RRF)
        
        RRF Score = Σ 1/(k + rank) for each result list
        
        This gives higher scores to documents that appear in both lists
        and/or at higher ranks.
        """
        # Create document lookup by id
        doc_lookup = {}
        rrf_scores = defaultdict(float)
        
        # Process vector results
        seen_ids_vector = set()
        rank = 1
        for doc in vector_results:
            doc_id = doc["id"]
            if doc_id not in seen_ids_vector:
                seen_ids_vector.add(doc_id)
                rrf_scores[doc_id] += 1 / (self.rrf_k + rank)
                doc_lookup[doc_id] = doc
                rank += 1
        
        # Process BM25 results
        seen_ids_bm25 = set()
        rank = 1
        for doc in bm25_results:
            doc_id = doc["id"]
            if doc_id not in seen_ids_bm25:
                seen_ids_bm25.add(doc_id)
                rrf_scores[doc_id] += 1 / (self.rrf_k + rank)
                if doc_id not in doc_lookup:
                    doc_lookup[doc_id] = doc
                rank += 1
        
        # Sort by RRF score
        sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        
        # Build final results
        results = []
        for doc_id in sorted_ids[:top_k]:
            doc = doc_lookup[doc_id].copy()
            doc["rrf_score"] = rrf_scores[doc_id]
            doc["in_vector"] = doc_id in seen_ids_vector
            doc["in_bm25"] = doc_id in seen_ids_bm25
            results.append(doc)
        
        return results


# Singleton
_hybrid_search: Optional[HybridSearch] = None


def get_hybrid_search() -> HybridSearch:
    global _hybrid_search
    if _hybrid_search is None:
        _hybrid_search = HybridSearch(
            vector_k=settings.vector_search_k,
            bm25_k=settings.bm25_search_k
        )
    return _hybrid_search

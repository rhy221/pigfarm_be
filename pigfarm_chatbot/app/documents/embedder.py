import google.generativeai as genai
from typing import Optional, List
import asyncio

from app.config import get_settings

settings = get_settings()


class DocumentEmbedder:
    """
    Generate embeddings using official Google Generative AI SDK.
    Uses 'models/gemini-embedding-001' with full 3072 dimensions.
    """
    
    def __init__(self):
        genai.configure(api_key=settings.google_api_key)
        self.model = settings.gemini_embedding_model
        # Use 1536 dimensions (Matryoshka)
        # - High accuracy (OpenAI standard)
        # - Fits within pgvector index limit (<2000)
        self.output_dim = 1536
    
    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        loop = asyncio.get_running_loop()
        
        def _call_api():
            result = genai.embed_content(
                model=self.model,
                content=text,
                task_type="retrieval_document",
                output_dimensionality=self.output_dim
            )
            return result['embedding']
            
        return await loop.run_in_executor(None, _call_api)
    
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (Batch processing).
        """
        if not texts:
            return []
            
        loop = asyncio.get_running_loop()
        batch_size = 100
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            
            def _call_batch():
                result = genai.embed_content(
                    model=self.model,
                    content=batch,
                    task_type="retrieval_document",
                    output_dimensionality=self.output_dim
                )
                return result['embedding']
            
            batch_embeddings = await loop.run_in_executor(None, _call_batch)
            all_embeddings.extend(batch_embeddings)
            
        return all_embeddings
    
    async def embed_chunks(self, chunks: List[dict]) -> List[dict]:
        """Add embeddings to chunk dictionaries"""
        contents = [chunk["content"] for chunk in chunks]
        
        try:
            embeddings = await self.embed_texts(contents)
            
            for chunk, embedding in zip(chunks, embeddings):
                chunk["embedding"] = embedding
                
            return chunks
        except Exception as e:
            print(f"Error embedding chunks: {e}")
            raise e


# Singleton instance
_embedder: Optional[DocumentEmbedder] = None


def get_embedder() -> DocumentEmbedder:
    global _embedder
    if _embedder is None:
        _embedder = DocumentEmbedder()
    return _embedder
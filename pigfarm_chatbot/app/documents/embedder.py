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
        self.output_dim = 1536
        # Global lock to prevent concurrent uploads from exceeding rate limits
        self._lock = asyncio.Lock()
    
    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        loop = asyncio.get_running_loop()
        
        async with self._lock: # Wait for lock
            def _call_api():
                result = genai.embed_content(
                    model=self.model,
                    content=text,
                    task_type="retrieval_document",
                    output_dimensionality=self.output_dim
                )
                return result['embedding']
            
            # Sleep a bit before call to be safe
            await asyncio.sleep(1)
            return await loop.run_in_executor(None, _call_api)
    
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (Sequential processing with Retry).
        Safe mode for Free Tier limits.
        """
        if not texts:
            return []
            
        loop = asyncio.get_running_loop()
        all_embeddings = []
        
        print(f"[Embedder] Starting sequential embedding for {len(texts)} chunks...")
        
        # Acquire global lock - Only one document can be processed at a time system-wide
        async with self._lock:
            for i, text in enumerate(texts):
                retries = 3
                while retries > 0:
                    try:
                        def _call_single():
                            result = genai.embed_content(
                                model=self.model,
                                content=text,
                                task_type="retrieval_document",
                                output_dimensionality=self.output_dim
                            )
                            return result['embedding']
                        
                        # Call API for single chunk
                        embedding = await loop.run_in_executor(None, _call_single)
                        all_embeddings.append(embedding)
                        
                        # Log progress
                        if (i + 1) % 5 == 0:
                            print(f"[Embedder] Processed {i + 1}/{len(texts)} chunks")
                        
                        # Sleep 2s -> Max 30 RPM (Safe for 100 RPM limit)
                        await asyncio.sleep(2) 
                        break # Success, exit retry loop
                        
                    except Exception as e:
                        error_msg = str(e)
                        if "429" in error_msg or "quota" in error_msg.lower() or "resource exhausted" in error_msg.lower():
                            print(f"[Embedder] Rate limit hit at chunk {i+1}. Retrying in 10s... (Left: {retries})")
                            await asyncio.sleep(15) # Wait longer if hit rate limit
                            retries -= 1
                        else:
                            print(f"[Embedder Error] Chunk {i+1} failed: {error_msg}")
                            raise e # Fatal error if not rate limit
                
                if retries == 0:
                    raise Exception(f"Failed to embed chunk {i+1} after retries")
            
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
import re
from typing import Optional
import tiktoken


class SemanticChunker:
    """
    Semantic text chunker that splits by paragraphs and sentences
    while respecting token limits
    """
    
    def __init__(
        self,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        encoding_name: str = "cl100k_base"
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.tokenizer = tiktoken.get_encoding(encoding_name)
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return len(self.tokenizer.encode(text))
    
    def split_into_paragraphs(self, text: str) -> list[str]:
        """Split text into paragraphs"""
        # Split by double newlines or multiple newlines
        paragraphs = re.split(r'\n\s*\n', text)
        # Clean up and filter empty paragraphs
        return [p.strip() for p in paragraphs if p.strip()]
    
    def split_into_sentences(self, text: str) -> list[str]:
        """Split text into sentences"""
        # Vietnamese and English sentence splitting
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def chunk_text(self, text: str, metadata: Optional[dict] = None) -> list[dict]:
        """
        Split text into semantic chunks with overlap.
        Returns list of chunks with metadata.
        """
        paragraphs = self.split_into_paragraphs(text)
        chunks = []
        current_chunk = []
        current_tokens = 0
        
        for para in paragraphs:
            para_tokens = self.count_tokens(para)
            
            # If single paragraph exceeds chunk size, split by sentences
            if para_tokens > self.chunk_size:
                # Save current chunk if exists
                if current_chunk:
                    chunks.append(self._create_chunk(
                        "\n\n".join(current_chunk),
                        len(chunks),
                        metadata
                    ))
                    current_chunk = []
                    current_tokens = 0
                
                # Split large paragraph by sentences
                sentence_chunks = self._chunk_by_sentences(para, metadata, len(chunks))
                chunks.extend(sentence_chunks)
                continue
            
            # Check if adding paragraph exceeds limit
            if current_tokens + para_tokens > self.chunk_size:
                # Save current chunk
                if current_chunk:
                    chunks.append(self._create_chunk(
                        "\n\n".join(current_chunk),
                        len(chunks),
                        metadata
                    ))
                
                # Start new chunk with overlap from previous
                overlap_text = self._get_overlap_text(current_chunk)
                current_chunk = [overlap_text] if overlap_text else []
                current_tokens = self.count_tokens(overlap_text) if overlap_text else 0
            
            current_chunk.append(para)
            current_tokens += para_tokens
        
        # Don't forget the last chunk
        if current_chunk:
            chunks.append(self._create_chunk(
                "\n\n".join(current_chunk),
                len(chunks),
                metadata
            ))
        
        return chunks
    
    def _chunk_by_sentences(
        self, 
        text: str, 
        metadata: Optional[dict],
        start_index: int
    ) -> list[dict]:
        """Split a large paragraph into sentence-based chunks"""
        sentences = self.split_into_sentences(text)
        chunks = []
        current_chunk = []
        current_tokens = 0
        
        for sentence in sentences:
            sentence_tokens = self.count_tokens(sentence)
            
            if current_tokens + sentence_tokens > self.chunk_size:
                if current_chunk:
                    chunks.append(self._create_chunk(
                        " ".join(current_chunk),
                        start_index + len(chunks),
                        metadata
                    ))
                current_chunk = []
                current_tokens = 0
            
            current_chunk.append(sentence)
            current_tokens += sentence_tokens
        
        if current_chunk:
            chunks.append(self._create_chunk(
                " ".join(current_chunk),
                start_index + len(chunks),
                metadata
            ))
        
        return chunks
    
    def _get_overlap_text(self, chunk_parts: list[str]) -> str:
        """Get overlap text from the end of previous chunk"""
        if not chunk_parts:
            return ""
        
        # Take last paragraph or part of it
        last_part = chunk_parts[-1]
        tokens = self.count_tokens(last_part)
        
        if tokens <= self.chunk_overlap:
            return last_part
        
        # Take last sentences up to overlap limit
        sentences = self.split_into_sentences(last_part)
        overlap_parts = []
        overlap_tokens = 0
        
        for sentence in reversed(sentences):
            sentence_tokens = self.count_tokens(sentence)
            if overlap_tokens + sentence_tokens > self.chunk_overlap:
                break
            overlap_parts.insert(0, sentence)
            overlap_tokens += sentence_tokens
        
        return " ".join(overlap_parts)
    
    def _create_chunk(
        self, 
        content: str, 
        index: int, 
        metadata: Optional[dict]
    ) -> dict:
        """Create a chunk dictionary with metadata"""
        return {
            "content": content,
            "chunk_index": index,
            "token_count": self.count_tokens(content),
            "metadata": metadata or {}
        }

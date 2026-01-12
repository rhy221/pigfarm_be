from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
import json

from app.db.database import get_db, async_session_maker
from app.documents.pdf_parser import PDFParser
from app.documents.chunker import SemanticChunker
from app.documents.embedder import get_embedder
from app.config import get_settings

settings = get_settings()
router = APIRouter()


class DocumentResponse(BaseModel):
    id: int
    filename: str
    chunk_count: int
    message: str


class DocumentListItem(BaseModel):
    id: int
    filename: str
    chunk_index: int
    created_at: str


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(file: UploadFile = File(...)):
    print(f"📥 API Upload: Nhận file {file.filename}")
    """
    Upload a PDF document for RAG.
    The document will be:
    1. Parsed to extract text
    2. Split into semantic chunks
    3. Embedded using Gemini
    4. Stored in PostgreSQL with pgvector
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Only PDF files are supported"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Parse PDF
        pdf_text = PDFParser.extract_text(content)
        metadata = PDFParser.get_metadata(content)
        
        if not pdf_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from PDF"
            )
        
        # Chunk the text
        chunker = SemanticChunker(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap
        )
        chunks = chunker.chunk_text(pdf_text, metadata)
        
        # Generate embeddings
        embedder = get_embedder()
        chunks_with_embeddings = await embedder.embed_chunks(chunks)
        
        # Store in database
        async with async_session_maker() as session:
            for chunk in chunks_with_embeddings:
                embedding_str = "[" + ",".join(map(str, chunk["embedding"])) + "]"
                
                await session.execute(
                    text("""
                        INSERT INTO chat_documents 
                        (filename, content, chunk_index, embedding, metadata)
                        VALUES (:filename, :content, :chunk_index, :embedding, :metadata)
                    """),
                    {
                        "filename": file.filename,
                        "content": chunk["content"],
                        "chunk_index": chunk["chunk_index"],
                        "embedding": embedding_str,
                        "metadata": json.dumps(chunk["metadata"])
                    }
                )
            
            await session.commit()
        
        return DocumentResponse(
            id=0,  # Will be set by DB
            filename=file.filename,
            chunk_count=len(chunks),
            message=f"Successfully uploaded and processed {file.filename} into {len(chunks)} chunks"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=list[DocumentListItem])
async def list_documents():
    """
    List all uploaded documents.
    """
    async with async_session_maker() as session:
        result = await session.execute(
            text("""
                SELECT id, filename, chunk_index, created_at
                FROM chat_documents
                ORDER BY filename, chunk_index
            """)
        )
        rows = result.fetchall()
        
        return [
            DocumentListItem(
                id=row.id,
                filename=row.filename,
                chunk_index=row.chunk_index,
                created_at=str(row.created_at)
            )
            for row in rows
        ]


@router.get("/summary")
async def get_documents_summary():
    """
    Get summary of all documents (grouped by filename).
    """
    async with async_session_maker() as session:
        result = await session.execute(
            text("""
                SELECT 
                    filename,
                    COUNT(*) as chunk_count,
                    MIN(created_at) as uploaded_at
                FROM chat_documents
                GROUP BY filename
                ORDER BY uploaded_at DESC
            """)
        )
        rows = result.fetchall()
        
        return {
            "total_documents": len(rows),
            "documents": [
                {
                    "filename": row.filename,
                    "chunk_count": row.chunk_count,
                    "uploaded_at": str(row.uploaded_at)
                }
                for row in rows
            ]
        }


@router.delete("/{filename}")
async def delete_document(filename: str):
    """
    Delete a document and all its chunks.
    """
    async with async_session_maker() as session:
        result = await session.execute(
            text("DELETE FROM chat_documents WHERE filename = :filename"),
            {"filename": filename}
        )
        await session.commit()
        
        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail=f"Document '{filename}' not found"
            )
        
        return {
            "message": f"Deleted document '{filename}' ({result.rowcount} chunks removed)"
        }

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
import json

from app.db.database import get_db, async_session_maker
from app.documents.pdf_parser import PDFParser
from app.documents.chunker import SemanticChunker
from app.documents.embedder import get_embedder
from app.config import get_settings

settings = get_settings()
router = APIRouter()


class BatchUploadResponse(BaseModel):
    total_files: int
    processed_files: int
    skipped_files: int
    details: List[dict]


class DocumentListItem(BaseModel):
    id: int
    filename: str
    chunk_index: int
    created_at: str


@router.post("/upload", response_model=BatchUploadResponse)
async def upload_documents(files: List[UploadFile] = File(...)):
    print(f"📥 API Batch Upload: Nhận {len(files)} files")
    
    results = []
    processed_count = 0
    skipped_count = 0
    
    embedder = get_embedder()
    chunker = SemanticChunker(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap
    )
    
    for file in files:
        try:
            print(f"--- Đang xử lý file: {file.filename} ---")
            
            # Validate file type
            if not file.filename.lower().endswith('.pdf'):
                results.append({
                    "filename": file.filename,
                    "status": "skipped",
                    "reason": "Chỉ hỗ trợ file PDF"
                })
                skipped_count += 1
                continue
            
            # Read and Parse
            content = await file.read()
            pdf_text = PDFParser.extract_text(content)
            metadata = PDFParser.get_metadata(content)
            
            if not pdf_text.strip():
                results.append({
                    "filename": file.filename,
                    "status": "skipped",
                    "reason": "Không thể trích xuất văn bản (File rỗng hoặc ảnh scan)"
                })
                skipped_count += 1
                continue
            
            # Chunking
            chunks = chunker.chunk_text(pdf_text, metadata)
            
            # Check chunk limit (Max 100 chunks per file)
            if len(chunks) > 100:
                print(f"⚠️ Bỏ qua file {file.filename}: {len(chunks)} chunks (> 100)")
                results.append({
                    "filename": file.filename,
                    "status": "skipped",
                    "reason": f"File quá lớn ({len(chunks)} chunks > 100). Vui lòng chia nhỏ file."
                })
                skipped_count += 1
                continue
            
            # Embedding (Sequential & Safe)
            chunks_with_embeddings = await embedder.embed_chunks(chunks)
            
            # Store in DB
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
            
            print(f"✅ Đã xử lý xong: {file.filename} ({len(chunks)} chunks)")
            results.append({
                "filename": file.filename,
                "status": "success",
                "chunks": len(chunks)
            })
            processed_count += 1
            
        except Exception as e:
            print(f"❌ Lỗi xử lý file {file.filename}: {str(e)}")
            results.append({
                "filename": file.filename,
                "status": "error",
                "reason": str(e)
            })
            skipped_count += 1
    
    return BatchUploadResponse(
        total_files=len(files),
        processed_files=processed_count,
        skipped_files=skipped_count,
        details=results
    )


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

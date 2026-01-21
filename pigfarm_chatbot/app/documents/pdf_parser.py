from pypdf import PdfReader
from io import BytesIO
from typing import Optional


class PDFParser:
    """Parse PDF files and extract text content"""
    
    @staticmethod
    def extract_text(file_content: bytes) -> str:
        """Extract all text from a PDF file"""
        reader = PdfReader(BytesIO(file_content))
        text_parts = []
        
        for page_num, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text_parts.append(f"[Trang {page_num + 1}]\n{page_text}")
        
        return "\n\n".join(text_parts)
    
    @staticmethod
    def extract_text_by_pages(file_content: bytes) -> list[dict]:
        """Extract text from each page separately"""
        reader = PdfReader(BytesIO(file_content))
        pages = []
        
        for page_num, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                pages.append({
                    "page_number": page_num + 1,
                    "content": page_text
                })
        
        return pages
    
    @staticmethod
    def get_metadata(file_content: bytes) -> dict:
        """Extract metadata from PDF"""
        reader = PdfReader(BytesIO(file_content))
        metadata = reader.metadata
        
        return {
            "title": metadata.title if metadata else None,
            "author": metadata.author if metadata else None,
            "subject": metadata.subject if metadata else None,
            "num_pages": len(reader.pages)
        }

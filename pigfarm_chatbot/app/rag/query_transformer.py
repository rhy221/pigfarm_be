from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from typing import Optional

from app.config import get_settings

settings = get_settings()


class QueryTransformer:
    """
    Transform user queries for better retrieval:
    1. Query Rewriting - Make queries clearer and more specific
    2. Multi-Query Generation - Generate multiple query variations
    """
    
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.google_api_key,
            temperature=0.3
        )
        
        # Query rewriting prompt
        self.rewrite_prompt = ChatPromptTemplate.from_messages([
            ("system", """Bạn là một chuyên gia viết lại câu hỏi để tìm kiếm tài liệu hiệu quả hơn.
            
Nhiệm vụ: Viết lại câu hỏi của người dùng thành một câu hỏi rõ ràng, cụ thể hơn, phù hợp để tìm kiếm trong tài liệu về chăn nuôi heo.

Quy tắc:
- Giữ nguyên ý nghĩa gốc
- Thêm các từ khóa chuyên ngành nếu cần
- Sử dụng ngôn ngữ tự nhiên, dễ hiểu
- Chỉ trả về câu hỏi đã viết lại, không giải thích

Ví dụ:
- "Heo bị ỉa chảy" → "Triệu chứng, nguyên nhân và cách điều trị bệnh tiêu chảy ở heo thịt"
- "Tiêm phòng lúc nào" → "Lịch tiêm phòng vaccine cho heo theo từng giai đoạn nuôi"
"""),
            ("human", "Câu hỏi gốc: {query}\n\nCâu hỏi viết lại:")
        ])
        
        # Multi-query generation prompt
        self.multi_query_prompt = ChatPromptTemplate.from_messages([
            ("system", """Bạn là một chuyên gia tạo các biến thể câu hỏi để tìm kiếm tài liệu chăn nuôi heo.

Nhiệm vụ: Tạo 3 biến thể câu hỏi khác nhau từ câu hỏi gốc. Mỗi biến thể nên tiếp cận vấn đề từ góc độ khác nhau.

Quy tắc:
- Mỗi biến thể trên một dòng riêng
- Không đánh số, không gạch đầu dòng
- Giữ liên quan đến chủ đề chăn nuôi heo
- Các biến thể phải khác nhau về cách diễn đạt

Ví dụ với câu hỏi "Heo bị sốt cao":
Nguyên nhân gây sốt cao ở heo và cách nhận biết
Cách hạ sốt và điều trị heo bị sốt
Các bệnh phổ biến gây sốt ở heo thịt
"""),
            ("human", "Câu hỏi gốc: {query}\n\n3 biến thể:")
        ])
    
    async def rewrite_query(self, query: str) -> str:
        """Rewrite query to be clearer and more specific"""
        chain = self.rewrite_prompt | self.llm
        result = await chain.ainvoke({"query": query})
        return result.content.strip()
    
    async def generate_multi_queries(self, query: str) -> list[str]:
        """Generate multiple query variations"""
        chain = self.multi_query_prompt | self.llm
        result = await chain.ainvoke({"query": query})
        
        # Parse the result into list
        queries = [q.strip() for q in result.content.strip().split("\n") if q.strip()]
        
        # Include original query
        return [query] + queries[:3]  # Original + 3 variations
    
    async def transform(self, query: str) -> dict:
        """
        Full query transformation pipeline:
        1. Rewrite the query
        2. Generate multiple variations
        """
        rewritten = await self.rewrite_query(query)
        multi_queries = await self.generate_multi_queries(rewritten)
        
        return {
            "original": query,
            "rewritten": rewritten,
            "variations": multi_queries
        }


# Singleton
_transformer: Optional[QueryTransformer] = None


def get_query_transformer() -> QueryTransformer:
    global _transformer
    if _transformer is None:
        _transformer = QueryTransformer()
    return _transformer

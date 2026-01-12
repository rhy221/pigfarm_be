from langchain_core.tools import tool

from app.rag.hybrid_search import get_hybrid_search
from app.rag.reranker import get_reranker
from app.agent.prompts import RAG_TOOL_DESCRIPTION


@tool
async def search_knowledge_base(query: str) -> str:
    """
    Tìm kiếm thông tin từ tài liệu kiến thức đã upload (PDF).
    
    Công cụ này dùng để:
    - Tìm hướng dẫn chăm sóc heo
    - Tra cứu cách điều trị bệnh
    - Đọc quy trình vệ sinh
    - Tìm lịch tiêm phòng vaccine
    - Tìm kiến thức nuôi heo, phòng bệnh
    
    Args:
        query: Câu hỏi hoặc từ khóa cần tìm (tiếng Việt)
    
    Returns:
        str: Thông tin liên quan từ tài liệu
    """
    try:
        hybrid_search = get_hybrid_search()
        reranker = get_reranker()
        
        # Step 1: Hybrid search with query transformation
        search_results = await hybrid_search.search(
            query=query,
            use_query_transformation=True,
            top_k=20
        )
        
        if not search_results:
            return "Không tìm thấy tài liệu nào liên quan. Có thể chưa có tài liệu được upload vào hệ thống."
        
        # Step 2: Rerank with Cohere cross-encoder
        reranked_results = await reranker.rerank_with_threshold(
            query=query,
            documents=search_results,
            threshold=0.3,
            top_k=5
        )
        
        if not reranked_results:
            return "Không tìm thấy tài liệu đủ liên quan đến câu hỏi của bạn."
        
        # Format results for LLM
        formatted_results = []
        for i, doc in enumerate(reranked_results, 1):
            formatted_results.append(
                f"[Tài liệu {i}] (Nguồn: {doc['filename']}, Độ liên quan: {doc['rerank_score']:.2f})\n"
                f"{doc['content']}\n"
            )
        
        return "\n---\n".join(formatted_results)
        
    except Exception as e:
        return f"Lỗi khi tìm kiếm tài liệu: {str(e)}"


# Export the tool
rag_tool = search_knowledge_base
rag_tool.description = RAG_TOOL_DESCRIPTION

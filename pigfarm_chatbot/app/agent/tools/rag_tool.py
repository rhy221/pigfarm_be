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
        print(f"\n[RAG] Searching for: '{query}'")
        search_results = await hybrid_search.search(
            query=query,
            use_query_transformation=True,
            top_k=20
        )
        
        print(f"[RAG] Hybrid Search found {len(search_results)} documents.")
        # for i, doc in enumerate(search_results[:5]):
        #     print(f"  - [{i+1}] {doc.get('filename', 'Unknown')} (RRF Score: {doc.get('rrf_score', 0):.4f})")
        
        if not search_results:
            return "Không tìm thấy tài liệu nào liên quan. Có thể chưa có tài liệu được upload vào hệ thống."
        
        # Step 2: Rerank with Cohere cross-encoder
        print("[RAG] Reranking results with Cohere...")
        reranked_results = await reranker.rerank_with_threshold(
            query=query,
            documents=search_results,
            threshold=0.3,
            top_k=5
        )
        
        print(f"[RAG] After Reranking (Threshold 0.3): {len(reranked_results)} documents.")
        for i, doc in enumerate(reranked_results):
            print(f"  > [{i+1}] {doc.get('filename', 'Unknown')} | Score: {doc.get('rerank_score', 0):.4f}")
            # print(f"    Preview: {doc.get('content', '')[:100]}...")
        
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
        import traceback
        print(f"\n❌ [RAG Tool Error]: {str(e)}")
        print(traceback.format_exc())
        return f"Lỗi khi tìm kiếm tài liệu: {str(e)}"


# Export the tool
rag_tool = search_knowledge_base
rag_tool.description = RAG_TOOL_DESCRIPTION

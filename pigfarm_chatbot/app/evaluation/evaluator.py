"""
Evaluation utilities for RAG & Agent quality assessment
"""
from typing import Optional
from langsmith import Client
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings

settings = get_settings()


class RAGEvaluator:
    """
    Evaluate RAG quality using LLM-as-judge pattern
    
    Metrics:
    1. Answer Relevance: Does answer address the question?
    2. Faithfulness: Is answer grounded in retrieved context?
    3. Context Relevance: Are retrieved docs relevant to question?
    """
    
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.google_api_key,
            temperature=0
        )
        
        # LangSmith client for logging evaluations
        if settings.langchain_api_key:
            self.client = Client(api_key=settings.langchain_api_key)
        else:
            self.client = None
    
    async def evaluate_answer_relevance(
        self, 
        question: str, 
        answer: str
    ) -> dict:
        """
        Evaluate if the answer addresses the question
        
        Returns:
            {
                "score": 0-1 (0=irrelevant, 1=highly relevant),
                "reasoning": str
            }
        """
        prompt = f"""Đánh giá mức độ liên quan của câu trả lời với câu hỏi.

Câu hỏi: {question}

Câu trả lời: {answer}

Tiêu chí:
- 1.0: Trả lời đầy đủ, chính xác câu hỏi
- 0.7: Trả lời đúng nhưng thiếu chi tiết
- 0.4: Trả lời một phần câu hỏi
- 0.0: Không liên quan hoặc sai

Trả lời theo format JSON:
{{"score": 0.8, "reasoning": "Câu trả lời đầy đủ nhưng..."}}
"""
        
        result = await self.llm.ainvoke(prompt)
        # Parse JSON from result
        import json
        try:
            evaluation = json.loads(result.content)
            return evaluation
        except:
            return {"score": 0.5, "reasoning": "Failed to parse"}
    
    async def evaluate_faithfulness(
        self,
        question: str,
        answer: str,
        contexts: list[str]
    ) -> dict:
        """
        Evaluate if answer is grounded in provided contexts
        
        Returns:
            {
                "score": 0-1,
                "reasoning": str,
                "hallucination_risk": "low" | "medium" | "high"
            }
        """
        contexts_text = "\n\n---\n\n".join(contexts)
        
        prompt = f"""Đánh giá xem câu trả lời có dựa vào tài liệu được cung cấp không.

Câu hỏi: {question}

Tài liệu tham khảo:
{contexts_text}

Câu trả lời: {answer}

Tiêu chí:
- 1.0: Tất cả thông tin trong câu trả lời đều có trong tài liệu
- 0.7: Phần lớn đúng, có thêm suy luận hợp lý
- 0.4: Một số thông tin không có trong tài liệu
- 0.0: Câu trả lời chủ yếu không dựa vào tài liệu (hallucination)

Trả lời theo format JSON:
{{"score": 0.9, "reasoning": "...", "hallucination_risk": "low"}}
"""
        
        result = await self.llm.ainvoke(prompt)
        import json
        try:
            evaluation = json.loads(result.content)
            return evaluation
        except:
            return {
                "score": 0.5, 
                "reasoning": "Failed to parse",
                "hallucination_risk": "unknown"
            }
    
    async def evaluate_context_relevance(
        self,
        question: str,
        contexts: list[str]
    ) -> dict:
        """
        Evaluate if retrieved contexts are relevant to question
        
        Returns:
            {
                "score": 0-1,
                "reasoning": str,
                "relevant_contexts": int,
                "total_contexts": int
            }
        """
        contexts_text = "\n\n---\n\n".join(
            [f"[Tài liệu {i+1}]\n{ctx}" for i, ctx in enumerate(contexts)]
        )
        
        prompt = f"""Đánh giá xem các tài liệu có liên quan đến câu hỏi không.

Câu hỏi: {question}

Các tài liệu:
{contexts_text}

Hãy đánh giá:
1. Mỗi tài liệu có liên quan không (có/không)
2. Tính điểm tổng = (số tài liệu liên quan) / (tổng số tài liệu)

Trả lời theo format JSON:
{{"score": 0.6, "reasoning": "3/5 tài liệu liên quan...", "relevant_contexts": 3, "total_contexts": 5}}
"""
        
        result = await self.llm.ainvoke(prompt)
        import json
        try:
            evaluation = json.loads(result.content)
            return evaluation
        except:
            return {
                "score": 0.5,
                "reasoning": "Failed to parse",
                "relevant_contexts": 0,
                "total_contexts": len(contexts)
            }
    
    async def evaluate_full_pipeline(
        self,
        question: str,
        answer: str,
        contexts: list[str],
        run_id: Optional[str] = None
    ) -> dict:
        """
        Run all evaluations and return comprehensive metrics
        
        Args:
            question: User question
            answer: Agent's answer
            contexts: Retrieved document contexts
            run_id: LangSmith run ID (optional)
        
        Returns:
            {
                "answer_relevance": {...},
                "faithfulness": {...},
                "context_relevance": {...},
                "overall_score": float
            }
        """
        # Run all evaluations in parallel
        import asyncio
        
        relevance, faithfulness, context_rel = await asyncio.gather(
            self.evaluate_answer_relevance(question, answer),
            self.evaluate_faithfulness(question, answer, contexts),
            self.evaluate_context_relevance(question, contexts)
        )
        
        # Calculate overall score (weighted average)
        overall_score = (
            relevance["score"] * 0.4 +
            faithfulness["score"] * 0.4 +
            context_rel["score"] * 0.2
        )
        
        evaluation = {
            "question": question,
            "answer": answer,
            "num_contexts": len(contexts),
            "answer_relevance": relevance,
            "faithfulness": faithfulness,
            "context_relevance": context_rel,
            "overall_score": overall_score
        }
        
        # Log to LangSmith if available
        if self.client and run_id:
            try:
                self.client.create_feedback(
                    run_id=run_id,
                    key="evaluation_score",
                    score=overall_score,
                    comment=f"Answer Relevance: {relevance['score']}, "
                            f"Faithfulness: {faithfulness['score']}, "
                            f"Context Relevance: {context_rel['score']}"
                )
            except Exception as e:
                print(f"Failed to log to LangSmith: {e}")
        
        return evaluation


# Singleton
_evaluator: Optional[RAGEvaluator] = None


def get_evaluator() -> RAGEvaluator:
    global _evaluator
    if _evaluator is None:
        _evaluator = RAGEvaluator()
    return _evaluator

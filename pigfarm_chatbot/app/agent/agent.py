from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from typing import AsyncGenerator, Optional, List, Dict, Any
import json

from app.config import get_settings
from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools.sql_tool import sql_tool
from app.agent.tools.rag_tool import rag_tool
from app.memory.session import session_store

settings = get_settings()


class PigFarmAgent:
    """
    Main agent that orchestrates tools for answering user questions
    about pig farm management.
    """
    
    def __init__(self):
        # Initialize Gemini LLM
        self.llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.google_api_key,
            temperature=0.3,
            streaming=True
        )
        
        # Available tools
        self.tools = [sql_tool, rag_tool]
        
        # Create agent (Graph-based in LangChain v1+)
        # create_agent returns a CompiledStateGraph
        self.graph = create_agent(
            model=self.llm,
            tools=self.tools,
            system_prompt=SYSTEM_PROMPT,
            # debug=settings.debug # Uncomment if debug available in args
        )
    
    async def chat(
        self,
        message: str,
        session_id: str
    ) -> str:
        """
        Process a user message and return the response.
        """
        # Get chat history
        memory = session_store.get_or_create_memory(session_id)
        history_messages = memory.messages
        
        # Construct input messages
        input_messages = history_messages + [HumanMessage(content=message)]
        
        # Run agent graph
        result = await self.graph.ainvoke({
            "messages": input_messages
        })
        
        # Find the last AIMessage with content
        messages = result["messages"]
        response = ""
        for msg in reversed(messages):
            if isinstance(msg, AIMessage) and msg.content:
                response = msg.content
                break
        
        if not response:
            response = "Xin lỗi, tôi không tìm thấy thông tin liên quan đến yêu cầu của bạn trong cơ sở dữ liệu và tài liệu hướng dẫn."
        
        # Save to memory
        session_store.add_message(session_id, message, str(response))
        
        return str(response)
    
    async def chat_stream(
        self,
        message: str,
        session_id: str
    ) -> AsyncGenerator[str, None]:
        """
        Process a user message and stream the response.
        """
        import asyncio
        
        memory = session_store.get_or_create_memory(session_id)
        history_messages = memory.messages
        input_messages = history_messages + [HumanMessage(content=message)]
        
        full_response = ""
        
        try:
            # Stream from agent graph
            async for event in self.graph.astream_events(
                {
                    "messages": input_messages
                },
                version="v2"
            ):
                kind = event["event"]
                name = event.get("name", "Unknown")
                
                # 1. Keep-Alive & Logging: Print status when tool starts
                # This helps developers trace the process on console
                if kind == "on_tool_start" and name not in ["QueryTransformer", "rerank_with_threshold"]:
                    print(f"⏳ [Agent] Đang thực thi công cụ: {name}...")

                # 2. Stream LLM tokens
                if kind == "on_chat_model_stream":
                    data = event.get("data", {})
                    chunk = data.get("chunk")
                    
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        # Handle content as either string or list of dicts/strings
                        content_str = ""
                        if isinstance(chunk.content, list):
                            for part in chunk.content:
                                if isinstance(part, str):
                                    content_str += part
                                elif isinstance(part, dict) and "text" in part:
                                    content_str += part["text"]
                                else:
                                    content_str += str(part)
                        else:
                            content_str = str(chunk.content)
                            
                        if content_str:
                            full_response += content_str
                            yield content_str
            
            # Fallback if no content was streamed
            if not full_response:
                fallback = "Xin lỗi, tôi không tìm thấy thông tin nào phù hợp để trả lời câu hỏi này."
                yield fallback
                full_response = fallback

            # Save to memory
            if full_response:
                session_store.add_message(session_id, message, full_response)
                
        except asyncio.CancelledError:
            print(f"[Warning] Chat stream session {session_id} was cancelled (Client disconnected).")
            return
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"\n❌ [ERROR] Chat Stream Failed for session {session_id}:")
            print(error_trace)
            
            error_msg = f"\n[Hệ thống] Xin lỗi, đã xảy ra lỗi trong quá trình xử lý. Chi tiết: {str(e)}"
            yield error_msg
            
            # Save error to memory so history isn't broken
            if full_response:
                session_store.add_message(session_id, message, full_response + "\n(Bị lỗi ngắt quãng)")
            else:
                session_store.add_message(session_id, message, error_msg)


# Singleton
_agent: Optional[PigFarmAgent] = None


def get_agent() -> PigFarmAgent:
    global _agent
    if _agent is None:
        _agent = PigFarmAgent()
    return _agent

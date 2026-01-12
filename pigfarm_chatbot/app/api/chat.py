from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from typing import Optional
import json
import uuid

from app.agent.agent import get_agent
from app.memory.session import session_store


router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """
    Send a message and get a complete response (non-streaming).
    """
    session_id = request.session_id or str(uuid.uuid4())
    
    try:
        agent = get_agent()
        response = await agent.chat(request.message, session_id)
        
        return ChatResponse(
            response=response,
            session_id=session_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/message/stream")
async def send_message_stream(request: ChatRequest):
    """
    Send a message and get a streaming response via Server-Sent Events.
    """
    session_id = request.session_id or str(uuid.uuid4())
    
    async def event_generator():
        try:
            agent = get_agent()
            
            # Send session_id first
            yield {
                "event": "session",
                "data": json.dumps({"session_id": session_id})
            }
            
            # Stream response
            async for chunk in agent.chat_stream(request.message, session_id):
                yield {
                    "event": "message",
                    "data": json.dumps({"content": chunk})
                }
            
            # Send done signal
            yield {
                "event": "done",
                "data": json.dumps({"status": "complete"})
            }
            
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }
    
    return EventSourceResponse(event_generator())


@router.get("/history/{session_id}")
async def get_chat_history(session_id: str):
    """
    Get chat history for a session.
    """
    history = session_store.get_history(session_id)
    return {"session_id": session_id, "history": history}


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """
    Clear a chat session.
    """
    session_store.clear_session(session_id)
    return {"message": f"Session {session_id} cleared"}

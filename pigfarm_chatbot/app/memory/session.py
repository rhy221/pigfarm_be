from datetime import datetime, timedelta
from typing import Optional
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.messages import HumanMessage, AIMessage
import threading

from app.config import get_settings

settings = get_settings()


class SessionStore:
    """In-memory session store with auto-expiration"""
    
    def __init__(self):
        self._sessions: dict[str, dict] = {}
        self._lock = threading.Lock()
    
    def get_or_create_memory(self, session_id: str) -> ConversationBufferWindowMemory:
        """Get existing memory or create new one for session"""
        with self._lock:
            self._cleanup_expired()
            
            if session_id not in self._sessions:
                self._sessions[session_id] = {
                    "memory": ConversationBufferWindowMemory(
                        k=10,  # Keep last 10 exchanges
                        return_messages=True,
                        memory_key="chat_history"
                    ),
                    "last_access": datetime.now()
                }
            else:
                self._sessions[session_id]["last_access"] = datetime.now()
            
            return self._sessions[session_id]["memory"]
    
    def add_message(self, session_id: str, human_message: str, ai_message: str):
        """Add a human-AI message pair to session memory"""
        memory = self.get_or_create_memory(session_id)
        memory.chat_memory.add_user_message(human_message)
        memory.chat_memory.add_ai_message(ai_message)
    
    def get_history(self, session_id: str) -> list[dict]:
        """Get chat history for a session"""
        memory = self.get_or_create_memory(session_id)
        messages = memory.chat_memory.messages
        
        history = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                history.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                history.append({"role": "assistant", "content": msg.content})
        
        return history
    
    def clear_session(self, session_id: str):
        """Clear a specific session"""
        with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
    
    def _cleanup_expired(self):
        """Remove expired sessions"""
        expiry_time = datetime.now() - timedelta(minutes=settings.session_timeout_minutes)
        expired = [
            sid for sid, data in self._sessions.items() 
            if data["last_access"] < expiry_time
        ]
        for sid in expired:
            del self._sessions[sid]


# Global session store instance
session_store = SessionStore()

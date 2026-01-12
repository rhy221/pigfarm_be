from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from typing import AsyncGenerator, Optional
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
        
        # Create prompt template
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # Create agent
        self.agent = create_tool_calling_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=self.prompt
        )
        
        # Create executor
        self.executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=settings.debug,
            handle_parsing_errors=True,
            max_iterations=5
        )
    
    async def chat(
        self,
        message: str,
        session_id: str
    ) -> str:
        """
        Process a user message and return the response.
        
        Args:
            message: User's question
            session_id: Session ID for memory
        
        Returns:
            Agent's response as string
        """
        # Get chat history
        memory = session_store.get_or_create_memory(session_id)
        chat_history = memory.chat_memory.messages
        
        # Run agent
        result = await self.executor.ainvoke({
            "input": message,
            "chat_history": chat_history
        })
        
        response = result["output"]
        
        # Save to memory
        session_store.add_message(session_id, message, response)
        
        return response
    
    async def chat_stream(
        self,
        message: str,
        session_id: str
    ) -> AsyncGenerator[str, None]:
        """
        Process a user message and stream the response.
        
        Args:
            message: User's question
            session_id: Session ID for memory
        
        Yields:
            Response chunks as they are generated
        """
        # Get chat history
        memory = session_store.get_or_create_memory(session_id)
        chat_history = memory.chat_memory.messages
        
        full_response = ""
        
        # Stream from agent
        async for event in self.executor.astream_events(
            {
                "input": message,
                "chat_history": chat_history
            },
            version="v2"
        ):
            kind = event["event"]
            
            # Stream LLM tokens
            if kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    full_response += content
                    yield content
        
        # Save to memory
        if full_response:
            session_store.add_message(session_id, message, full_response)


# Singleton
_agent: Optional[PigFarmAgent] = None


def get_agent() -> PigFarmAgent:
    global _agent
    if _agent is None:
        _agent = PigFarmAgent()
    return _agent

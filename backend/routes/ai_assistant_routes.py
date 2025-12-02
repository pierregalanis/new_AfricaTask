"""
AI Assistant Routes
Handles AI chatbot for helping users create tasks and find taskers.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import uuid4
import logging
import os

from database import get_database
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/ai-assistant", tags=["ai_assistant"])

# Get the Emergent LLM key from environment
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime

class ChatRequest(BaseModel):
    message: str
    session_id: str
    chat_history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    response: str
    session_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """
    Chat with AI assistant to get help creating tasks and finding taskers.
    """
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    try:
        # Get available service categories from database
        categories = await db.categories.find({}, {"_id": 0}).to_list(100)
        category_list = ", ".join([cat.get("name_en", "") for cat in categories if cat.get("name_en")])
        
        # Create system message with context
        system_message = f"""You are a helpful AI assistant for TaskRabbit Africa, a platform connecting clients with taskers in Ivory Coast and Senegal.

Your role is to:
1. Help users find taskers or book services
2. Suggest appropriate service categories
3. Answer questions about the booking process
4. Help write clear task descriptions

Available service categories: {category_list}

IMPORTANT RULES:
- Be CONCISE and DIRECT - ask only 2-3 essential questions maximum
- DON'T overwhelm users with long lists of questions
- Get straight to the point
- When they give basic info (like "cleaning in Cocody"), suggest they browse taskers immediately
- Only ask about: location, date/time, and any special requirements
- Keep responses SHORT (2-3 sentences max)
- Guide them to CREATE TASK or BROWSE TASKERS quickly

User role: {current_user.role}
User language preference: {"French" if hasattr(current_user, 'language') and current_user.language == 'fr' else "English"}

Example good responses:
- "Perfect! For cleaning in Cocody, click 'Browse Services' > 'Cleaning' to see available taskers with ratings. When do you need this done?"
- "I can help! Need: City/area, date/time. Then click 'Create Task' > 'Plumbing' to post your request."

Respond in the user's preferred language. Keep it BRIEF and ACTION-oriented."""

        # Initialize chat with session ID
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{current_user.id}_{request.session_id}",
            system_message=system_message
        )
        
        # Configure to use OpenAI GPT-5
        chat.with_model("openai", "gpt-5")
        
        # Create user message
        user_message = UserMessage(text=request.message)
        
        # Send message and get response
        response_text = await chat.send_message(user_message)
        
        # Store chat history in database for persistence
        chat_record = {
            "id": str(uuid4()),
            "user_id": current_user.id,
            "session_id": request.session_id,
            "message": request.message,
            "response": response_text,
            "timestamp": datetime.utcnow()
        }
        await db.ai_chat_history.insert_one(chat_record)
        
        return ChatResponse(
            response=response_text,
            session_id=request.session_id
        )
        
    except Exception as e:
        logger.error(f"Error in AI chat: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat request: {str(e)}"
        )


@router.get("/chat-history/{session_id}")
async def get_chat_history(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """
    Retrieve chat history for a session.
    """
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    try:
        history = await db.ai_chat_history.find(
            {"user_id": current_user.id, "session_id": session_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(100)
        
        return history
        
    except Exception as e:
        logger.error(f"Error fetching chat history: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch chat history"
        )

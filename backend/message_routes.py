"""
Message Routes
Handles in-app messaging between clients and taskers.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
import logging

from database import get_database
from models import Message, MessageCreate, UserRole

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api", tags=["messages"])


@router.post("/messages", response_model=Message, status_code=status.HTTP_201_CREATED)
async def send_message(
    message: MessageCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Send a message in a task chat."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    # Get task to determine receiver
    task = await db.tasks.find_one({"id": message.task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Determine receiver based on sender role
    if current_user.role == UserRole.CLIENT:
        if not task.get("assigned_tasker_id"):
            raise HTTPException(status_code=400, detail="Task has no assigned tasker")
        receiver_id = task["assigned_tasker_id"]
    else:
        receiver_id = task["client_id"]
    
    # Create message
    new_message = Message(
        **message.model_dump(),
        sender_id=current_user.id,
        receiver_id=receiver_id
    )
    
    await db.messages.insert_one(new_message.model_dump())
    logger.info(f"Message sent in task {message.task_id}")
    
    return new_message


@router.get("/messages/task/{task_id}", response_model=List[Message])
async def get_task_messages(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get all messages for a task."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    # Verify user is part of this task
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if current_user.role == UserRole.CLIENT and task["client_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if current_user.role == UserRole.TASKER and task.get("assigned_tasker_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get messages
    messages = await db.messages.find(
        {"task_id": task_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    # Mark messages as read if current user is receiver
    await db.messages.update_many(
        {
            "task_id": task_id,
            "receiver_id": current_user.id,
            "is_read": False
        },
        {"$set": {"is_read": True}}
    )
    
    return [Message(**msg) for msg in messages]


@router.get("/messages/unread")
async def get_unread_count(
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get count of unread messages for current user."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    unread_count = await db.messages.count_documents({
        "receiver_id": current_user.id,
        "is_read": False
    })
    
    return {"unread_count": unread_count}

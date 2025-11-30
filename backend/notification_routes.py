"""
Notification Routes
Handles notification creation, fetching, and management.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4
import logging

from database import get_database
from models import User, UserRole

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


async def get_current_user_from_token(token: str, db: AsyncIOMotorDatabase) -> User:
    """Get current user from token."""
    from auth import get_current_user as auth_get_current_user
    
    user = await auth_get_current_user(token, db)
    return user


async def create_notification(
    db: AsyncIOMotorDatabase,
    user_id: str,
    notification_type: str,
    task_id: str,
    task_title: str,
    message: Optional[str] = None
):
    """Helper function to create a notification."""
    try:
        notification = {
            "id": str(uuid4()),
            "user_id": user_id,
            "type": notification_type,
            "task_id": task_id,
            "task_title": task_title,
            "message": message,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.notifications.insert_one(notification)
        logger.info(f"Created notification: {notification_type} for user {user_id}")
        return notification
        
    except Exception as e:
        logger.error(f"Error creating notification: {str(e)}", exc_info=True)


@router.get("")
async def get_notifications(
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get all notifications for the current user."""
    try:
        user = await get_current_user_from_token(token, db)
        
        # Get all notifications for user, sorted by newest first
        notifications = await db.notifications.find(
            {"user_id": user.id},
            {"_id": 0}
        ).sort("created_at", -1).limit(50).to_list(50)
        
        # Count unread
        unread_count = await db.notifications.count_documents({
            "user_id": user.id,
            "is_read": False
        })
        
        return {
            "notifications": notifications,
            "unread_count": unread_count
        }
        
    except Exception as e:
        logger.error(f"Error fetching notifications: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notifications"
        )


@router.put("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Mark a notification as read."""
    try:
        user = await get_current_user_from_token(token, db)
        
        # Update notification
        result = await db.notifications.update_one(
            {"id": notification_id, "user_id": user.id},
            {"$set": {"is_read": True}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"message": "Notification marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification"
        )


@router.put("/mark-all-read")
async def mark_all_notifications_as_read(
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Mark all notifications as read for the current user."""
    try:
        user = await get_current_user_from_token(token, db)
        
        await db.notifications.update_many(
            {"user_id": user.id, "is_read": False},
            {"$set": {"is_read": True}}
        )
        
        return {"message": "All notifications marked as read"}
        
    except Exception as e:
        logger.error(f"Error marking all as read: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notifications"
        )


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Delete a notification."""
    try:
        user = await get_current_user_from_token(token, db)
        
        result = await db.notifications.delete_one({
            "id": notification_id,
            "user_id": user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"message": "Notification deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification"
        )

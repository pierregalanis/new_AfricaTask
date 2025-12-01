"""
Tasker Routes
Handles tasker-specific profile and service management.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Form, File, UploadFile
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
import logging
import json

from database import get_database
from models import UserResponse, UserRole

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/taskers", tags=["taskers"])


@router.get("/earnings")
async def get_tasker_earnings(
    period: str = "all",  # all, week, month
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get tasker earnings summary and history."""
    from auth import get_current_user as get_user
    from datetime import datetime, timedelta
    
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only taskers can view earnings"
        )
    
    # Calculate date range
    now = datetime.utcnow()
    date_filter = {}
    
    if period == "week":
        week_ago = now - timedelta(days=7)
        date_filter = {"completed_at": {"$gte": week_ago}}
    elif period == "month":
        month_ago = now - timedelta(days=30)
        date_filter = {"completed_at": {"$gte": month_ago}}
    
    # Get all completed & paid tasks
    base_query = {
        "assigned_tasker_id": current_user.id,
        "status": "completed",
        "is_paid": True
    }
    
    paid_tasks = await db.tasks.find({**base_query, **date_filter}, {"_id": 0}).to_list(1000)
    
    # Get pending tasks (completed but not paid)
    pending_tasks = await db.tasks.find({
        "assigned_tasker_id": current_user.id,
        "status": "completed",
        "is_paid": False
    }, {"_id": 0}).to_list(1000)
    
    # Calculate totals
    total_earnings = sum(task.get("total_amount", 0) for task in paid_tasks)
    pending_earnings = sum(task.get("total_amount", 0) for task in pending_tasks)
    
    # Week and month earnings
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    week_earnings = sum(
        task.get("total_amount", 0) 
        for task in paid_tasks 
        if task.get("completed_at") and task["completed_at"] >= week_ago
    )
    
    month_earnings = sum(
        task.get("total_amount", 0) 
        for task in paid_tasks 
        if task.get("completed_at") and task["completed_at"] >= month_ago
    )
    
    # Payment history
    payment_history = [
        {
            "title": task.get("title"),
            "client_name": task.get("client_name", "Unknown"),
            "completed_at": task.get("completed_at"),
            "hours_worked": task.get("hours_worked"),
            "total_amount": task.get("total_amount", 0),
            "is_paid": task.get("is_paid", False),
            "payment_method": task.get("payment_method", "cash")
        }
        for task in (paid_tasks + pending_tasks)
    ]
    
    # Sort by date descending
    payment_history.sort(key=lambda x: x.get("completed_at") or datetime.min, reverse=True)
    
    return {
        "total_earnings": total_earnings,
        "pending_earnings": pending_earnings,
        "pending_count": len(pending_tasks),
        "week_earnings": week_earnings,
        "month_earnings": month_earnings,
        "total_tasks": len(paid_tasks),
        "payment_history": payment_history[:50]  # Latest 50
    }


@router.put("/profile", response_model=UserResponse)
async def update_tasker_profile(
    services: Optional[str] = Form(None),  # JSON string of services array
    hourly_rate: Optional[float] = Form(None),
    bio: Optional[str] = Form(None),
    max_travel_distance: Optional[float] = Form(None),
    is_available: Optional[bool] = Form(None),
    certifications: Optional[str] = Form(None),  # JSON string
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Update tasker profile."""
    # DEBUG: Write params to file
    import datetime
    with open('/tmp/tasker_update_debug.log', 'a') as f:
        f.write(f"\n{'='*60}\n")
        f.write(f"[{datetime.datetime.now()}]\n")
        f.write(f"services: {services}\n")
        f.write(f"hourly_rate: {hourly_rate}\n")
        f.write(f"bio: {bio}\n")
        f.write(f"max_travel_distance: {max_travel_distance}\n")
        f.write(f"is_available: {is_available}\n")
    
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only taskers can update tasker profile"
        )
    
    # Build update dict
    update_data = {}
    
    # DEBUG: Temporarily raise exception to see what we're receiving
    # raise HTTPException(status_code=400, detail=f"DEBUG - services: {services}, type: {type(services)}")
    
    if services:
        try:
            services_list = json.loads(services)
            update_data["tasker_profile.services"] = services_list
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid services format: {str(e)}")
    
    if hourly_rate is not None:
        update_data["tasker_profile.hourly_rate"] = hourly_rate
    
    if bio is not None:
        update_data["tasker_profile.bio"] = bio
    
    if max_travel_distance is not None:
        update_data["tasker_profile.max_travel_distance"] = max_travel_distance
    
    if is_available is not None:
        update_data["tasker_profile.is_available"] = is_available
    
    if certifications:
        try:
            cert_list = json.loads(certifications)
            update_data["tasker_profile.certifications"] = cert_list
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid certifications format")
    
    if update_data:
        logger.info(f"Final update_data before MongoDB: {update_data}")
        result = await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
        logger.info(f"MongoDB update result - matched: {result.matched_count}, modified: {result.modified_count}")
        logger.info(f"Tasker profile updated: {current_user.id}")
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "hashed_password": 0})
    return UserResponse(**updated_user)

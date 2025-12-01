"""
Scheduled/Recurring Tasks Routes
Handles recurring task bookings.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Form
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import uuid4
import logging

from database import get_database
from models import UserRole, Task
from pydantic import BaseModel

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/recurring-tasks", tags=["recurring_tasks"])


class RecurringTask(BaseModel):
    id: str
    client_id: str
    assigned_tasker_id: str
    title: str
    description: str
    category_id: str
    frequency: str  # 'daily', 'weekly', 'biweekly', 'monthly'
    scheduled_time: str  # e.g., "09:00"
    day_of_week: Optional[int] = None  # 0-6 for weekly
    day_of_month: Optional[int] = None  # 1-31 for monthly
    hourly_rate: float
    estimated_hours: float
    next_occurrence: datetime
    is_active: bool
    created_at: datetime
    last_generated_at: Optional[datetime] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_recurring_task(
    assigned_tasker_id: str = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    category_id: str = Form(...),
    frequency: str = Form(...),
    scheduled_time: str = Form(...),
    day_of_week: Optional[int] = Form(None),
    day_of_month: Optional[int] = Form(None),
    hourly_rate: float = Form(...),
    estimated_hours: float = Form(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Create a recurring task schedule."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=403,
            detail="Only clients can create recurring tasks"
        )
    
    # Validate frequency
    valid_frequencies = ['daily', 'weekly', 'biweekly', 'monthly']
    if frequency not in valid_frequencies:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid frequency. Must be one of: {', '.join(valid_frequencies)}"
        )
    
    # Calculate next occurrence
    now = datetime.utcnow()
    next_occurrence = now
    
    if frequency == 'daily':
        next_occurrence = now + timedelta(days=1)
    elif frequency == 'weekly':
        if day_of_week is None:
            raise HTTPException(status_code=400, detail="day_of_week required for weekly tasks")
        # Calculate next occurrence based on day_of_week
        days_ahead = day_of_week - now.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        next_occurrence = now + timedelta(days=days_ahead)
    elif frequency == 'biweekly':
        next_occurrence = now + timedelta(days=14)
    elif frequency == 'monthly':
        if day_of_month is None:
            raise HTTPException(status_code=400, detail="day_of_month required for monthly tasks")
        # Simple implementation - set to next month
        if now.month == 12:
            next_occurrence = now.replace(year=now.year + 1, month=1, day=day_of_month)
        else:
            next_occurrence = now.replace(month=now.month + 1, day=day_of_month)
    
    # Create recurring task
    recurring_task = {
        "id": str(uuid4()),
        "client_id": current_user.id,
        "assigned_tasker_id": assigned_tasker_id,
        "title": title,
        "description": description,
        "category_id": category_id,
        "frequency": frequency,
        "scheduled_time": scheduled_time,
        "day_of_week": day_of_week,
        "day_of_month": day_of_month,
        "hourly_rate": hourly_rate,
        "estimated_hours": estimated_hours,
        "next_occurrence": next_occurrence,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "last_generated_at": None
    }
    
    await db.recurring_tasks.insert_one(recurring_task)
    
    return RecurringTask(**recurring_task)


@router.get("", response_model=List[RecurringTask])
async def get_recurring_tasks(
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get user's recurring tasks."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    query = {}
    if current_user.role == UserRole.CLIENT:
        query["client_id"] = current_user.id
    elif current_user.role == UserRole.TASKER:
        query["assigned_tasker_id"] = current_user.id
    
    tasks = await db.recurring_tasks.find(query, {"_id": 0}).sort("next_occurrence", 1).to_list(100)
    return [RecurringTask(**t) for t in tasks]


@router.put("/{task_id}/toggle")
async def toggle_recurring_task(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Activate or deactivate a recurring task."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    task = await db.recurring_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Recurring task not found")
    
    # Check permissions
    if current_user.id != task["client_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Toggle active status
    new_status = not task.get("is_active", True)
    await db.recurring_tasks.update_one(
        {"id": task_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {
        "message": f"Recurring task {'activated' if new_status else 'deactivated'}",
        "is_active": new_status
    }


@router.delete("/{task_id}")
async def delete_recurring_task(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Delete a recurring task."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    task = await db.recurring_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Recurring task not found")
    
    # Check permissions
    if current_user.id != task["client_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.recurring_tasks.delete_one({"id": task_id})
    
    return {"message": "Recurring task deleted successfully"}

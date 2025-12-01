"""
Dispute Resolution Routes
Handles disputes on completed tasks.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Form
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime
from uuid import uuid4
import logging

from database import get_database
from models import UserRole
from pydantic import BaseModel

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/disputes", tags=["disputes"])


class Dispute(BaseModel):
    id: str
    task_id: str
    task_title: str
    client_id: str
    client_name: str
    tasker_id: str
    tasker_name: str
    raised_by: str  # client_id or tasker_id
    raised_by_role: str  # 'client' or 'tasker'
    reason: str
    description: str
    status: str  # 'open', 'investigating', 'resolved', 'closed'
    resolution: Optional[str] = None
    resolved_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_dispute(
    task_id: str = Form(...),
    reason: str = Form(...),
    description: str = Form(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Create a dispute for a completed task."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    # Get task details
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Verify user is part of the task
    is_client = current_user.id == task["client_id"]
    is_tasker = current_user.id == task.get("assigned_tasker_id")
    
    if not (is_client or is_tasker):
        raise HTTPException(status_code=403, detail="Not authorized to dispute this task")
    
    # Check if task is completed
    if task["status"] != "completed":
        raise HTTPException(
            status_code=400, 
            detail="Disputes can only be raised for completed tasks"
        )
    
    # Check if dispute already exists for this task
    existing_dispute = await db.disputes.find_one({"task_id": task_id}, {"_id": 0})
    if existing_dispute:
        raise HTTPException(
            status_code=400, 
            detail="A dispute already exists for this task"
        )
    
    # Get client and tasker names
    client = await db.users.find_one({"id": task["client_id"]}, {"_id": 0})
    tasker = await db.users.find_one({"id": task.get("assigned_tasker_id")}, {"_id": 0})
    
    # Create dispute
    dispute = {
        "id": str(uuid4()),
        "task_id": task_id,
        "task_title": task.get("title", "Untitled Task"),
        "client_id": task["client_id"],
        "client_name": client.get("full_name", "Unknown Client"),
        "tasker_id": task.get("assigned_tasker_id"),
        "tasker_name": tasker.get("full_name", "Unknown Tasker"),
        "raised_by": current_user.id,
        "raised_by_role": current_user.role.value,
        "reason": reason,
        "description": description,
        "status": "open",
        "resolution": None,
        "resolved_by": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "resolved_at": None
    }
    
    await db.disputes.insert_one(dispute)
    
    # Send notification to the other party
    from notification_routes import create_notification
    notify_user_id = task["client_id"] if is_tasker else task.get("assigned_tasker_id")
    if notify_user_id:
        await create_notification(
            db=db,
            user_id=notify_user_id,
            notification_type="dispute_raised",
            task_id=task_id,
            task_title=task.get("title", "Task"),
            message=f"A dispute has been raised for task: {task.get('title')}"
        )
    
    return dispute


@router.get("", response_model=List[Dispute])
async def get_disputes(
    status_filter: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get disputes for current user or all disputes (admin only)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    query = {}
    
    # Regular users can only see their own disputes
    if current_user.role != UserRole.ADMIN:
        query["$or"] = [
            {"client_id": current_user.id},
            {"tasker_id": current_user.id}
        ]
    
    # Filter by status if provided
    if status_filter:
        query["status"] = status_filter
    
    disputes = await db.disputes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Dispute(**d) for d in disputes]


@router.get("/{dispute_id}", response_model=Dispute)
async def get_dispute(
    dispute_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get dispute details."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    dispute = await db.disputes.find_one({"id": dispute_id}, {"_id": 0})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    # Check permissions
    if current_user.role != UserRole.ADMIN:
        if current_user.id not in [dispute["client_id"], dispute["tasker_id"]]:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return Dispute(**dispute)


@router.put("/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: str,
    resolution: str = Form(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Resolve a dispute (admin only)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    # Only admins can resolve disputes
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403, 
            detail="Only admins can resolve disputes"
        )
    
    dispute = await db.disputes.find_one({"id": dispute_id}, {"_id": 0})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    # Update dispute
    update_data = {
        "status": "resolved",
        "resolution": resolution,
        "resolved_by": current_user.id,
        "resolved_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.disputes.update_one({"id": dispute_id}, {"$set": update_data})
    
    # Send notifications to both parties
    from notification_routes import create_notification
    await create_notification(
        db=db,
        user_id=dispute["client_id"],
        notification_type="dispute_resolved",
        task_id=dispute["task_id"],
        task_title=dispute["task_title"],
        message=f"Your dispute has been resolved: {resolution}"
    )
    await create_notification(
        db=db,
        user_id=dispute["tasker_id"],
        notification_type="dispute_resolved",
        task_id=dispute["task_id"],
        task_title=dispute["task_title"],
        message=f"Dispute resolved: {resolution}"
    )
    
    return {"message": "Dispute resolved successfully", "resolution": resolution}


@router.put("/{dispute_id}/status")
async def update_dispute_status(
    dispute_id: str,
    new_status: str = Form(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Update dispute status (admin only)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    # Only admins can update dispute status
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403, 
            detail="Only admins can update dispute status"
        )
    
    valid_statuses = ["open", "investigating", "resolved", "closed"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    dispute = await db.disputes.find_one({"id": dispute_id}, {"_id": 0})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    await db.disputes.update_one(
        {"id": dispute_id}, 
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Dispute status updated successfully"}

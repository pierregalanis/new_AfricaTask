"""
Task Routes
Handles task creation, retrieval, updates, and payment marking.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Optional, List
import logging

from database import get_database
from models import Task, TaskCreate, TaskStatus, UserRole, PaymentMethod

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.post("", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(
    task: TaskCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Create a new task (client only)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can create tasks")
    
    new_task = Task(**task.model_dump(), client_id=current_user.id)
    await db.tasks.insert_one(new_task.model_dump())
    
    logger.info(f"Task created: {new_task.id}")
    return new_task


@router.get("", response_model=List[Task])
async def get_tasks(
    status: Optional[TaskStatus] = Query(None),
    category_id: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    min_budget: Optional[float] = Query(None),
    max_budget: Optional[float] = Query(None),
    client_id: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get tasks with filters."""
    query = {}
    
    # Only return tasks with assigned taskers (TaskRabbit instant booking model)
    query["assigned_tasker_id"] = {"$ne": None, "$exists": True}
    
    if status:
        query["status"] = status
    if category_id:
        query["category_id"] = category_id
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if min_budget:
        query["budget"] = {"$gte": min_budget}
    if max_budget:
        if "budget" in query:
            query["budget"]["$lte"] = max_budget
        else:
            query["budget"] = {"$lte": max_budget}
    if client_id:
        query["client_id"] = client_id
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Task(**task) for task in tasks]


@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get task by ID."""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(**task)


@router.put("/{task_id}/status")
async def update_task_status(
    task_id: str,
    new_status: TaskStatus,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Update task status."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check permissions
    if current_user.role == UserRole.CLIENT and task["client_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role == UserRole.TASKER and task.get("assigned_tasker_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {"status": new_status, "updated_at": datetime.utcnow()}
    if new_status == TaskStatus.COMPLETED:
        update_data["completed_at"] = datetime.utcnow()
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return Task(**updated_task)


@router.post("/{task_id}/mark-paid-cash")
async def mark_task_paid_cash(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Mark a completed task as paid (cash payment) - Tasker only."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    # Only taskers can mark as paid
    if current_user.role != UserRole.TASKER:
        raise HTTPException(status_code=403, detail="Only taskers can confirm cash payment")
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Verify this tasker is assigned to the task
    if task.get("assigned_tasker_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized - not your task")
    
    # Verify task is completed
    if task.get("status") != TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Task must be completed before marking as paid")
    
    # Check if already paid
    if task.get("is_paid"):
        raise HTTPException(status_code=400, detail="Task is already marked as paid")
    
    # Update task with payment info
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "is_paid": True,
            "payment_method": PaymentMethod.CASH,
            "updated_at": datetime.utcnow()
        }}
    )
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    logger.info(f"Task {task_id} marked as paid (cash) by tasker {current_user.id}")
    return Task(**updated_task)

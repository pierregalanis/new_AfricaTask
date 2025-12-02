from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import logging

from models import UserRole
from auth import get_current_user, oauth2_scheme
from database import get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["timers"])


@router.post("/tasks/{task_id}/start-timer")
async def start_job_timer(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Start job timer when tasker arrives and begins work."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(status_code=403, detail="Only taskers can start timer")
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.get("assigned_tasker_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    # Update task with timer start
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "timer_started_at": datetime.utcnow(),
            "is_timer_running": True
        }}
    )
    
    logger.info(f"Job timer started for task {task_id}")
    return {"message": "Timer started", "started_at": datetime.utcnow()}


@router.post("/tasks/{task_id}/stop-timer")
async def stop_job_timer(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Stop job timer when tasker finishes work."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(status_code=403, detail="Only taskers can stop timer")
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.get("assigned_tasker_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    if not task.get("is_timer_running"):
        raise HTTPException(status_code=400, detail="Timer is not running")
    
    # Calculate actual hours worked
    started_at = task.get("timer_started_at")
    stopped_at = datetime.utcnow()
    
    if started_at:
        time_diff = stopped_at - started_at
        actual_hours = time_diff.total_seconds() / 3600  # Convert to hours
    else:
        actual_hours = 0.0
    
    # Update task with timer stop and actual hours
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "timer_stopped_at": stopped_at,
            "is_timer_running": False,
            "actual_hours_worked": actual_hours
        }}
    )
    
    logger.info(f"Job timer stopped for task {task_id}. Actual hours: {actual_hours:.2f}")
    return {
        "message": "Timer stopped",
        "stopped_at": stopped_at,
        "actual_hours_worked": round(actual_hours, 2)
    }


@router.get("/tasks/{task_id}/timer-status")
async def get_timer_status(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get current timer status for a task."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Verify user is part of this task
    if current_user.role == UserRole.CLIENT and task["client_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role == UserRole.TASKER and task.get("assigned_tasker_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Calculate current elapsed time if timer is running
    elapsed_hours = None
    if task.get("is_timer_running") and task.get("timer_started_at"):
        time_diff = datetime.utcnow() - task["timer_started_at"]
        elapsed_hours = time_diff.total_seconds() / 3600
    
    return {
        "is_timer_running": task.get("is_timer_running", False),
        "timer_started_at": task.get("timer_started_at"),
        "timer_stopped_at": task.get("timer_stopped_at"),
        "actual_hours_worked": task.get("actual_hours_worked"),
        "elapsed_hours": round(elapsed_hours, 2) if elapsed_hours else None
    }

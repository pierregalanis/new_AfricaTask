from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime
import logging

from models import (
    TaskCreate, Task, TaskStatus,
    TaskApplicationCreate, TaskApplication, ApplicationStatus,
    UserRole
)
from auth import get_current_user, oauth2_scheme
from database import get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["tasks"])


@router.post("/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(
    task: TaskCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Instant booking - Create a task with assigned tasker (TaskRabbit style)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can create bookings")
    
    # Verify tasker exists and is available
    tasker = await db.users.find_one({"id": task.tasker_id, "role": "tasker"}, {"_id": 0})
    if not tasker:
        raise HTTPException(status_code=404, detail="Tasker not found")
    
    if not tasker.get("tasker_profile", {}).get("is_available", False):
        raise HTTPException(status_code=400, detail="Tasker is not available")
    
    # Calculate total cost
    total_cost = task.duration_hours * task.hourly_rate
    
    # Create task with instant assignment
    task_dict = task.model_dump()
    new_task = Task(
        **task_dict,
        client_id=current_user.id,
        assigned_tasker_id=task.tasker_id,
        total_cost=total_cost,
        status=TaskStatus.ASSIGNED
    )
    
    await db.tasks.insert_one(new_task.model_dump())
    logger.info(f"Instant booking created: {new_task.id} by {current_user.email} for tasker {task.tasker_id}")
    
    return new_task


@router.get("/tasks", response_model=List[Task])
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


@router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get task by ID."""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(**task)


@router.put("/tasks/{task_id}/status")
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
    
    # Create notification for client when task is completed
    if new_status == TaskStatus.COMPLETED and current_user.role == UserRole.TASKER:
        from notification_routes import create_notification
        await create_notification(
            db=db,
            user_id=task["client_id"],
            notification_type="task_completed",
            task_id=task_id,
            task_title=task.get("title", "Task")
        )
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return Task(**updated_task)


@router.post("/tasks/{task_id}/cancel")
async def cancel_task(
    task_id: str,
    reason: str = Form(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Cancel a task with optional penalty."""
    from auth import get_current_user as get_user
    from notification_routes import create_notification
    current_user = await get_user(token, db)
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check permissions
    is_client = current_user.id == task["client_id"]
    is_tasker = current_user.id == task.get("assigned_tasker_id")
    
    if not (is_client or is_tasker):
        raise HTTPException(status_code=403, detail="Not authorized to cancel this task")
    
    # Check if task can be cancelled
    if task["status"] in [TaskStatus.COMPLETED, "cancelled"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot cancel a task that is already {task['status']}"
        )
    
    # Calculate penalty if applicable
    penalty_amount = 0
    penalty_reason = ""
    
    # If task is in progress, apply penalty
    if task["status"] == TaskStatus.IN_PROGRESS:
        hours_passed = 0
        if task.get("timer_start_time"):
            hours_passed = (datetime.utcnow() - task["timer_start_time"]).total_seconds() / 3600
        
        if hours_passed > 0:
            penalty_amount = hours_passed * task.get("hourly_rate", 0) * 0.5  # 50% penalty
            penalty_reason = "Task cancelled after work started"
    
    # Update task status
    update_data = {
        "status": "cancelled",
        "cancellation_reason": reason,
        "cancelled_by": current_user.id,
        "cancelled_by_role": current_user.role.value,
        "cancelled_at": datetime.utcnow(),
        "penalty_amount": penalty_amount,
        "penalty_reason": penalty_reason
    }
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    # Send notification to the other party
    notify_user_id = task["client_id"] if is_tasker else task.get("assigned_tasker_id")
    if notify_user_id:
        await create_notification(
            db=db,
            user_id=notify_user_id,
            notification_type="task_cancelled",
            task_id=task_id,
            task_title=task.get("title", "Task"),
            message=f"Task has been cancelled. Reason: {reason}"
        )
    
    return {
        "message": "Task cancelled successfully",
        "penalty_amount": penalty_amount,
        "penalty_reason": penalty_reason
    }


@router.post("/tasks/{task_id}/mark-paid-cash")
async def mark_task_paid_cash(
    task_id: str,
    hours_worked: float = Form(None),
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Mark a completed task as paid (cash payment) - Tasker only."""
    from auth import get_current_user as get_user
    from models import PaymentMethod
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
    
    # Determine hours worked (priority: manual input > timer > estimated > default)
    final_hours = hours_worked or task.get("hours_worked") or task.get("estimated_hours", 2)
    
    # Calculate total_amount
    rate = task.get("hourly_rate", 0)
    total_amount = final_hours * rate
    
    # Update task with payment info
    update_data = {
        "is_paid": True,
        "payment_method": PaymentMethod.CASH,
        "total_amount": total_amount,
        "hours_worked": final_hours,  # Save the actual hours
        "paid_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": update_data}
    )
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    logger.info(f"Task {task_id} marked as paid (cash) by tasker {current_user.id}")
    return Task(**updated_task)


# ============================================================================
# TASK APPLICATION ROUTES
# ============================================================================

@router.post("/tasks/{task_id}/apply", response_model=TaskApplication, status_code=status.HTTP_201_CREATED)
async def apply_to_task(
    task_id: str,
    application: TaskApplicationCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Apply to a task (taskers only)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(status_code=403, detail="Only taskers can apply to tasks")
    
    # Check if task exists
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task["status"] != TaskStatus.POSTED:
        raise HTTPException(status_code=400, detail="Task is not available for applications")
    
    # Check if already applied
    existing_app = await db.task_applications.find_one({
        "task_id": task_id,
        "tasker_id": current_user.id
    })
    if existing_app:
        raise HTTPException(status_code=400, detail="Already applied to this task")
    
    # Create application
    new_app = TaskApplication(**application.model_dump(), tasker_id=current_user.id)
    await db.task_applications.insert_one(new_app.model_dump())
    
    # Update task application count
    await db.tasks.update_one(
        {"id": task_id},
        {"$inc": {"applications_count": 1}}
    )
    
    logger.info(f"Tasker {current_user.id} applied to task {task_id}")
    return new_app


@router.get("/tasks/{task_id}/applications", response_model=List[TaskApplication])
async def get_task_applications(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get applications for a task (client only)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    # Verify task ownership
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if current_user.role == UserRole.CLIENT and task["client_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    applications = await db.task_applications.find(
        {"task_id": task_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return [TaskApplication(**app) for app in applications]


@router.get("/taskers/applications", response_model=List[TaskApplication])
async def get_tasker_applications(
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get all applications by current tasker."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(status_code=403, detail="Only taskers can view their applications")
    
    applications = await db.task_applications.find(
        {"tasker_id": current_user.id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return [TaskApplication(**app) for app in applications]


@router.post("/tasks/{task_id}/assign/{tasker_id}")
async def assign_task_to_tasker(
    task_id: str,
    tasker_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Assign a task to a tasker (client only)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    # Verify task ownership
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task["client_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if application exists
    application = await db.task_applications.find_one({
        "task_id": task_id,
        "tasker_id": tasker_id
    })
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Update task
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "assigned_tasker_id": tasker_id,
            "status": TaskStatus.ASSIGNED,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Update application status
    await db.task_applications.update_one(
        {"task_id": task_id, "tasker_id": tasker_id},
        {"$set": {"status": ApplicationStatus.ACCEPTED}}
    )
    
    # Reject other applications
    await db.task_applications.update_many(
        {"task_id": task_id, "tasker_id": {"$ne": tasker_id}},
        {"$set": {"status": ApplicationStatus.REJECTED}}
    )
    
    logger.info(f"Task {task_id} assigned to tasker {tasker_id}")
    return {"message": "Task assigned successfully"}


@router.post("/tasks/{task_id}/accept")
async def accept_task(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Accept assigned task (tasker only)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(status_code=403, detail="Only taskers can accept tasks")
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.get("assigned_tasker_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    if task["status"] != TaskStatus.ASSIGNED:
        raise HTTPException(status_code=400, detail="Task cannot be accepted in current status")
    
    # Update task status
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {"status": TaskStatus.IN_PROGRESS, "updated_at": datetime.utcnow()}}
    )
    
    # Create notification for client
    from notification_routes import create_notification
    await create_notification(
        db=db,
        user_id=task["client_id"],
        notification_type="task_accepted",
        task_id=task_id,
        task_title=task.get("title", "Task")
    )
    
    logger.info(f"Tasker {current_user.id} accepted task {task_id}")
    return {"message": "Task accepted"}


@router.post("/tasks/{task_id}/reject")
async def reject_task(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Reject assigned task (tasker only)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(status_code=403, detail="Only taskers can reject tasks")
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.get("assigned_tasker_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    # Mark task as cancelled (keep assigned_tasker_id for reference)
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": TaskStatus.CANCELLED,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Create notification for client
    from notification_routes import create_notification
    await create_notification(
        db=db,
        user_id=task["client_id"],
        notification_type="task_rejected",
        task_id=task_id,
        task_title=task.get("title", "Task")
    )
    
    logger.info(f"Tasker {current_user.id} rejected task {task_id}")
    return {"message": "Task rejected"}


# ============================================================================
# LOCATION TRACKING ROUTES
# ============================================================================


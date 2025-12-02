from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime
import logging

from models import PaymentCreate, Payment, PaymentStatus, UserRole
from auth import get_current_user, oauth2_scheme
from database import get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["payments"])


@router.post("/payments", response_model=Payment, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment: PaymentCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Create a payment (client only)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can create payments")
    
    # Verify task
    task = await db.tasks.find_one({"id": payment.task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task["client_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not your task")
    
    if not task.get("assigned_tasker_id"):
        raise HTTPException(status_code=400, detail="Task has no assigned tasker")
    
    # Create payment record
    new_payment = Payment(
        **payment.model_dump(),
        client_id=current_user.id,
        tasker_id=task["assigned_tasker_id"],
        transaction_id=f"TXN-{uuid.uuid4()}"
    )
    
    await db.payments.insert_one(new_payment.model_dump())
    
    logger.info(f"Payment created: {new_payment.id} for task {payment.task_id}")
    return new_payment


@router.post("/payments/{payment_id}/complete")
async def complete_payment(
    payment_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Mark payment as completed (for cash, or after external payment confirmation)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Only client or tasker involved can mark as complete
    if current_user.id not in [payment["client_id"], payment["tasker_id"]]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.payments.update_one(
        {"id": payment_id},
        {"$set": {
            "status": PaymentStatus.COMPLETED,
            "completed_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Payment marked as completed"}


@router.get("/payments/task/{task_id}", response_model=List[Payment])
async def get_task_payments(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get payments for a task."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    payments = await db.payments.find(
        {"task_id": task_id},
        {"_id": 0}
    ).to_list(100)
    
    # Filter based on role
    filtered_payments = []
    for payment in payments:
        if current_user.role == UserRole.CLIENT and payment["client_id"] == current_user.id:
            filtered_payments.append(Payment(**payment))
        elif current_user.role == UserRole.TASKER and payment["tasker_id"] == current_user.id:
            filtered_payments.append(Payment(**payment))
    
    return filtered_payments


# ============================================================================
# GPS TRACKING ROUTES
# ============================================================================

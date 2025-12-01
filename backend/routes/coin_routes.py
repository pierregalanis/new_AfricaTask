"""
Coin System Routes
Handles virtual currency for promotions and rewards.
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

router = APIRouter(prefix="/api/coins", tags=["coins"])


class CoinTransaction(BaseModel):
    id: str
    user_id: str
    amount: int  # Positive for credit, negative for debit
    transaction_type: str  # 'welcome_bonus', 'task_reward', 'booking_discount', 'referral'
    description: str
    task_id: Optional[str] = None
    created_at: datetime


@router.get("/balance")
async def get_coin_balance(
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get current user's coin balance."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    return {"balance": user.get("coin_balance", 0)}


@router.get("/transactions", response_model=List[CoinTransaction])
async def get_coin_transactions(
    limit: int = 50,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get user's coin transaction history."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    transactions = await db.coin_transactions.find(
        {"user_id": current_user.id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return [CoinTransaction(**t) for t in transactions]


@router.post("/award")
async def award_coins(
    user_id: str = Form(...),
    amount: int = Form(...),
    transaction_type: str = Form(...),
    description: str = Form(...),
    task_id: Optional[str] = Form(None),
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Award coins to a user (admin only or system)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    # Only admins can manually award coins
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only admins can award coins"
        )
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create transaction
    transaction = {
        "id": str(uuid4()),
        "user_id": user_id,
        "amount": amount,
        "transaction_type": transaction_type,
        "description": description,
        "task_id": task_id,
        "created_at": datetime.utcnow()
    }
    
    await db.coin_transactions.insert_one(transaction)
    
    # Update user balance
    current_balance = user.get("coin_balance", 0)
    new_balance = current_balance + amount
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"coin_balance": new_balance}}
    )
    
    return {
        "message": "Coins awarded successfully",
        "new_balance": new_balance
    }


@router.post("/spend")
async def spend_coins(
    amount: int = Form(...),
    task_id: str = Form(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Spend coins on a booking discount."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Check user balance
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    current_balance = user.get("coin_balance", 0)
    
    if current_balance < amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient coins. Balance: {current_balance}"
        )
    
    # Create transaction
    transaction = {
        "id": str(uuid4()),
        "user_id": current_user.id,
        "amount": -amount,  # Negative for spending
        "transaction_type": "booking_discount",
        "description": f"Applied {amount} coins as discount",
        "task_id": task_id,
        "created_at": datetime.utcnow()
    }
    
    await db.coin_transactions.insert_one(transaction)
    
    # Update user balance
    new_balance = current_balance - amount
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"coin_balance": new_balance}}
    )
    
    # Calculate discount amount (e.g., 1 coin = 100 CFA)
    discount_cfa = amount * 100
    
    return {
        "message": "Coins spent successfully",
        "new_balance": new_balance,
        "discount_amount": discount_cfa
    }


async def auto_award_coins_for_task(db, user_id: str, task_id: str, task_title: str):
    """Auto-award coins after task completion (called by task completion logic)."""
    # Award 10 coins for completing a task
    transaction = {
        "id": str(uuid4()),
        "user_id": user_id,
        "amount": 10,
        "transaction_type": "task_reward",
        "description": f"Reward for completing: {task_title}",
        "task_id": task_id,
        "created_at": datetime.utcnow()
    }
    
    await db.coin_transactions.insert_one(transaction)
    
    # Update user balance
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    current_balance = user.get("coin_balance", 0)
    new_balance = current_balance + 10
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"coin_balance": new_balance}}
    )
    
    logger.info(f"Awarded 10 coins to user {user_id} for task completion")


async def award_welcome_bonus(db, user_id: str):
    """Award welcome bonus to new users."""
    # Award 50 coins as welcome bonus
    transaction = {
        "id": str(uuid4()),
        "user_id": user_id,
        "amount": 50,
        "transaction_type": "welcome_bonus",
        "description": "Welcome bonus for joining AfricaTask!",
        "task_id": None,
        "created_at": datetime.utcnow()
    }
    
    await db.coin_transactions.insert_one(transaction)
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"coin_balance": 50}}
    )
    
    logger.info(f"Awarded 50 welcome coins to user {user_id}")

"""
Category Routes
Handles service category operations.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
import logging

from database import get_database
from models import ServiceCategory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["categories"])


@router.get("/categories", response_model=List[ServiceCategory])
async def get_categories(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get all service categories."""
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return [ServiceCategory(**cat) for cat in categories]


@router.get("/categories/{category_id}", response_model=ServiceCategory)
async def get_category(
    category_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific category by ID."""
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return ServiceCategory(**category)

from fastapi import APIRouter, HTTPException, status, Depends, Form
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime
from uuid import uuid4
import logging

from database import get_database
from models import UserRole
from pydantic import BaseModel

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


class Favorite(BaseModel):
    id: str
    user_id: str
    tasker_id: str
    tasker_name: str
    tasker_rating: float
    tasker_services: List[str]
    added_at: datetime


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_favorite(
    tasker_id: str = Form(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    tasker = await db.users.find_one({"id": tasker_id, "role": "tasker"}, {"_id": 0})
    if not tasker:
        raise HTTPException(status_code=404, detail="Tasker not found")
    
    existing = await db.favorites.find_one({
        "user_id": current_user.id,
        "tasker_id": tasker_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already in favorites")
    
    favorite = {
        "id": str(uuid4()),
        "user_id": current_user.id,
        "tasker_id": tasker_id,
        "tasker_name": tasker.get("full_name", "Unknown"),
        "tasker_rating": tasker.get("tasker_profile", {}).get("average_rating", 0),
        "tasker_services": tasker.get("tasker_profile", {}).get("services", []),
        "added_at": datetime.utcnow()
    }
    
    await db.favorites.insert_one(favorite)
    
    # Convert datetime to ISO format for JSON response
    favorite_response = favorite.copy()
    favorite_response["added_at"] = favorite["added_at"].isoformat()
    
    return {"message": "Tasker added to favorites", "favorite": favorite_response}


@router.get("", response_model=List[Favorite])
async def get_favorites(
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    favorites = await db.favorites.find(
        {"user_id": current_user.id},
        {"_id": 0}
    ).sort("added_at", -1).to_list(100)
    
    return [Favorite(**f) for f in favorites]


@router.delete("/{tasker_id}")
async def remove_favorite(
    tasker_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    result = await db.favorites.delete_one({
        "user_id": current_user.id,
        "tasker_id": tasker_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    
    return {"message": "Tasker removed from favorites"}


@router.get("/check/{tasker_id}")
async def check_favorite(
    tasker_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    favorite = await db.favorites.find_one({
        "user_id": current_user.id,
        "tasker_id": tasker_id
    })
    
    return {"is_favorite": favorite is not None}

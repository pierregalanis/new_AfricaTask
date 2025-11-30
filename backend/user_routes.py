"""
User Routes
Handles user profile management and related operations.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Form, File, UploadFile
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
import logging

from database import get_database
from models import UserResponse, UserRole, Language
from utils import save_upload_file

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get user by ID."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    full_name: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    language: Optional[Language] = Form(None),
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Update user profile."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    # Build update dict
    update_data = {}
    if full_name:
        update_data["full_name"] = full_name
    if phone:
        update_data["phone"] = phone
    if address:
        update_data["address"] = address
    if city:
        update_data["city"] = city
    if latitude is not None:
        update_data["latitude"] = latitude
    if longitude is not None:
        update_data["longitude"] = longitude
    if language:
        update_data["language"] = language
    
    if update_data:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "hashed_password": 0})
    return UserResponse(**updated_user)


@router.put("/location")
async def update_user_location(
    location_data: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Update user location (latitude/longitude)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    update_data = {}
    if "latitude" in location_data:
        update_data["latitude"] = location_data["latitude"]
    if "longitude" in location_data:
        update_data["longitude"] = location_data["longitude"]
    
    if update_data:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "hashed_password": 0})
    return UserResponse(**updated_user)


@router.post("/profile/image")
async def upload_profile_image(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Upload profile image."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    try:
        file_path = await save_upload_file(file, "profiles")
        
        # Update user's profile image
        if current_user.role == UserRole.TASKER:
            await db.users.update_one(
                {"id": current_user.id},
                {"$set": {"tasker_profile.profile_image": file_path}}
            )
        
        return {"file_path": file_path}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

"""
Tasker Routes
Handles tasker-specific profile and service management.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Form, File, UploadFile
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
import logging
import json

from database import get_database
from models import UserResponse, UserRole

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/taskers", tags=["taskers"])


@router.put("/profile", response_model=UserResponse)
async def update_tasker_profile(
    services: Optional[str] = Form(None),  # JSON string of services array
    hourly_rate: Optional[float] = Form(None),
    bio: Optional[str] = Form(None),
    max_travel_distance: Optional[float] = Form(None),
    certifications: Optional[str] = Form(None),  # JSON string
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Update tasker profile."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only taskers can update tasker profile"
        )
    
    # Build update dict
    update_data = {}
    
    if services:
        try:
            services_list = json.loads(services)
            update_data["tasker_profile.services"] = services_list
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid services format")
    
    if hourly_rate is not None:
        update_data["tasker_profile.hourly_rate"] = hourly_rate
    
    if bio is not None:
        update_data["tasker_profile.bio"] = bio
    
    if max_travel_distance is not None:
        update_data["tasker_profile.max_travel_distance"] = max_travel_distance
    
    if certifications:
        try:
            cert_list = json.loads(certifications)
            update_data["tasker_profile.certifications"] = cert_list
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid certifications format")
    
    if update_data:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
        logger.info(f"Tasker profile updated: {current_user.id}")
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "hashed_password": 0})
    return UserResponse(**updated_user)

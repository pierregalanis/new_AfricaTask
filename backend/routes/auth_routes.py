"""
Authentication and User Profile Routes
Handles user registration, login, profile management, and location updates.
"""

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import logging
import os
from pathlib import Path

from database import get_database
from auth import create_access_token, get_current_user
from models import (
    UserInDB, UserCreate, UserResponse, UserRole, Token,
    TaskerProfile
)

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Register a new user."""
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    from models import UserInDB
    new_user = UserInDB(**user.model_dump())
    await db.users.insert_one(new_user.model_dump())
    
    # Create tasker profile if role is tasker
    if user.role == UserRole.TASKER:
        tasker_profile = TaskerProfile(
            user_id=new_user.id,
            skills=[],
            hourly_rate=user.hourly_rate or 5000.0
        )
        await db.tasker_profiles.insert_one(tasker_profile.model_dump())
    
    logger.info(f"New user registered: {new_user.email}")
    return UserResponse(**new_user.model_dump())


@router.post("/auth/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Login user and return access token."""
    from auth import verify_password
    
    user = await db.users.find_one({"email": form_data.username}, {"_id": 0})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["id"]})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get current user information."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    return UserResponse(**current_user.model_dump())


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get user by ID."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)


@router.put("/users/profile", response_model=UserResponse)
async def update_profile(
    full_name: str = None,
    phone: str = None,
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update user profile."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    update_data = {"updated_at": datetime.utcnow()}
    if full_name:
        update_data["full_name"] = full_name
    if phone:
        update_data["phone"] = phone
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    return UserResponse(**updated_user)


@router.put("/users/location")
async def update_user_location(
    latitude: float,
    longitude: float,
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update user's location."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {
            "latitude": latitude,
            "longitude": longitude,
            "updated_at": datetime.utcnow()
        }}
    )
    
    logger.info(f"User {current_user.id} location updated")
    return {"message": "Location updated", "latitude": latitude, "longitude": longitude}


@router.post("/users/profile/image")
async def upload_profile_image(
    file: UploadFile = File(...),
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Upload user profile image."""
    from auth import get_current_user as get_user
    import secrets
    
    current_user = await get_user(token, db)
    
    # Save file
    upload_dir = Path(__file__).parent.parent / "uploads" / "profiles"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_extension = file.filename.split(".")[-1]
    filename = f"{current_user.id}_{secrets.token_hex(8)}.{file_extension}"
    file_path = upload_dir / filename
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Update user
    image_url = f"/uploads/profiles/{filename}"
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"profile_image": image_url}}
    )
    
    return {"image_url": image_url}

"""
Authentication Routes
Handles user registration, login, and authentication.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import logging

from database import get_database
from models import UserCreate, UserResponse, UserRole, Token, TaskerProfile, UserInDB
from auth import get_password_hash, verify_password, create_access_token

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Register a new user (client or tasker)."""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user document
    user_dict = user.model_dump(exclude={"password"})
    user_dict["hashed_password"] = get_password_hash(user.password)
    user_dict["created_at"] = datetime.utcnow()
    user_dict["is_active"] = True
    user_dict["is_verified"] = False
    
    # Initialize tasker profile if role is tasker
    if user.role == UserRole.TASKER:
        user_dict["tasker_profile"] = TaskerProfile().model_dump()
    
    # Create User object to get the ID
    new_user = UserInDB(**user_dict)
    
    # Insert into database
    await db.users.insert_one(new_user.model_dump())
    
    logger.info(f"New user registered: {user.email} ({user.role})")
    return UserResponse(**new_user.model_dump())


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Login and get access token."""
    # Find user
    user = await db.users.find_one({"email": form_data.username}, {"_id": 0})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    logger.info(f"User logged in: {user['email']}")
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get current user information."""
    from auth import get_current_user as get_user
    user = await get_user(token, db)
    return UserResponse(**user.model_dump())

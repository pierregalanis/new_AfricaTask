from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from dotenv import load_dotenv
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timedelta
import os
import logging
import json

from models import (
    UserCreate, User, UserResponse, UserRole, TaskerProfile,
    TaskCreate, Task, TaskStatus,
    TaskApplicationCreate, TaskApplication, ApplicationStatus,
    ReviewCreate, Review,
    LocationUpdate, TaskerLocation,
    PaymentCreate, Payment, PaymentStatus,
    Token, Language, ServiceCategory,
    MessageCreate, Message
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, oauth2_scheme
)
from database import connect_to_mongo, close_mongo_connection, get_database
from seed_categories import seed_service_categories
from utils import save_upload_file, calculate_distance, calculate_eta

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create FastAPI app
app = FastAPI(title="AfricaTask API", version="1.0.0")

# Create API router with prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# STARTUP & SHUTDOWN EVENTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize database connection and seed data."""
    await connect_to_mongo()
    db = await get_database()
    await seed_service_categories(db)
    logger.info("Application startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection."""
    await close_mongo_connection()
    logger.info("Application shutdown complete")


# ============================================================================
# AUTHENTICATION ROUTES
# ============================================================================

@api_router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
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
    from models import UserInDB
    new_user = UserInDB(**user_dict)
    
    # Insert into database
    await db.users.insert_one(new_user.model_dump())
    
    logger.info(f"New user registered: {user.email} ({user.role})")
    return UserResponse(**new_user.model_dump())


@api_router.post("/auth/login", response_model=Token)
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


@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get current user information."""
    from auth import get_current_user as get_user
    user = await get_user(token, db)
    return UserResponse(**user.model_dump())


# ============================================================================
# USER ROUTES
# ============================================================================

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get user by ID."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)


@api_router.put("/users/profile", response_model=UserResponse)
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


@api_router.post("/users/profile/image")
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


# ============================================================================
# TASKER PROFILE ROUTES
# ============================================================================

@api_router.put("/taskers/profile")
async def update_tasker_profile(
    bio: Optional[str] = Form(None),
    hourly_rate: Optional[float] = Form(None),
    service_categories: Optional[str] = Form(None),  # JSON string
    availability: Optional[str] = Form(None),  # JSON string
    is_available: Optional[bool] = Form(None),
    max_travel_distance: Optional[float] = Form(None),
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Update tasker profile."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(status_code=403, detail="Only taskers can update tasker profile")
    
    update_data = {}
    if bio is not None:
        update_data["tasker_profile.bio"] = bio
    if hourly_rate is not None:
        update_data["tasker_profile.hourly_rate"] = hourly_rate
    if service_categories:
        update_data["tasker_profile.service_categories"] = json.loads(service_categories)
    if availability:
        update_data["tasker_profile.availability"] = json.loads(availability)
    if is_available is not None:
        update_data["tasker_profile.is_available"] = is_available
    if max_travel_distance is not None:
        update_data["tasker_profile.max_travel_distance"] = max_travel_distance
    
    if update_data:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "hashed_password": 0})
    return UserResponse(**updated_user)


@api_router.post("/taskers/certifications")
async def upload_certification(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Upload certification document."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(status_code=403, detail="Only taskers can upload certifications")
    
    try:
        file_path = await save_upload_file(file, "certifications")
        
        # Add to tasker's certifications
        await db.users.update_one(
            {"id": current_user.id},
            {"$push": {"tasker_profile.certifications": file_path}}
        )
        
        return {"file_path": file_path}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.post("/taskers/portfolio")
async def upload_portfolio_image(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Upload portfolio image."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(status_code=403, detail="Only taskers can upload portfolio images")
    
    try:
        file_path = await save_upload_file(file, "portfolios")
        
        # Add to tasker's portfolio
        await db.users.update_one(
            {"id": current_user.id},
            {"$push": {"tasker_profile.portfolio_images": file_path}}
        )
        
        return {"file_path": file_path}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.get("/taskers/search", response_model=List[UserResponse])
async def search_taskers(
    category_id: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None),
    max_rate: Optional[float] = Query(None),
    is_available: Optional[bool] = Query(True),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Search for taskers with filters."""
    query = {"role": UserRole.TASKER}
    
    if category_id:
        query["tasker_profile.service_categories"] = category_id
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if min_rating:
        query["tasker_profile.average_rating"] = {"$gte": min_rating}
    if max_rate:
        query["tasker_profile.hourly_rate"] = {"$lte": max_rate}
    if is_available is not None:
        query["tasker_profile.is_available"] = is_available
    
    taskers = await db.users.find(query, {"_id": 0, "hashed_password": 0}).to_list(100)
    return [UserResponse(**tasker) for tasker in taskers]


# ============================================================================
# SERVICE CATEGORY ROUTES
# ============================================================================

@api_router.get("/categories", response_model=List[ServiceCategory])
async def get_categories(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get all service categories."""
    categories = await db.service_categories.find({}, {"_id": 0}).to_list(100)
    return [ServiceCategory(**cat) for cat in categories]


@api_router.get("/categories/{category_id}", response_model=ServiceCategory)
async def get_category(category_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get category by ID."""
    category = await db.service_categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return ServiceCategory(**category)


# ============================================================================
# TASK ROUTES
# ============================================================================

@api_router.post("/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
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


@api_router.get("/tasks", response_model=List[Task])
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


@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get task by ID."""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(**task)


@api_router.put("/tasks/{task_id}/status")
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
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return Task(**updated_task)


# ============================================================================
# TASK APPLICATION ROUTES
# ============================================================================

@api_router.post("/tasks/{task_id}/apply", response_model=TaskApplication, status_code=status.HTTP_201_CREATED)
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


@api_router.get("/tasks/{task_id}/applications", response_model=List[TaskApplication])
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


@api_router.get("/taskers/applications", response_model=List[TaskApplication])
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


@api_router.post("/tasks/{task_id}/assign/{tasker_id}")
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


@api_router.post("/tasks/{task_id}/accept")
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
    
    logger.info(f"Tasker {current_user.id} accepted task {task_id}")
    return {"message": "Task accepted"}


@api_router.post("/tasks/{task_id}/reject")
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
    
    # Update task status back to posted
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "assigned_tasker_id": None,
            "status": TaskStatus.POSTED,
            "updated_at": datetime.utcnow()
        }}
    )
    
    logger.info(f"Tasker {current_user.id} rejected task {task_id}")
    return {"message": "Task rejected"}


# ============================================================================
# REVIEW ROUTES
# ============================================================================

@api_router.post("/reviews", response_model=Review, status_code=status.HTTP_201_CREATED)
async def create_review(
    review: ReviewCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Create a review (clients only, after task completion)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can create reviews")
    
    # Verify task
    task = await db.tasks.find_one({"id": review.task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task["client_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not your task")
    
    if task["status"] != TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Can only review completed tasks")
    
    # Check if already reviewed
    existing_review = await db.reviews.find_one({
        "task_id": review.task_id,
        "client_id": current_user.id
    })
    if existing_review:
        raise HTTPException(status_code=400, detail="Task already reviewed")
    
    # Create review
    new_review = Review(**review.model_dump(), client_id=current_user.id)
    await db.reviews.insert_one(new_review.model_dump())
    
    # Update tasker's average rating
    all_reviews = await db.reviews.find({"tasker_id": review.tasker_id}, {"_id": 0}).to_list(1000)
    total_reviews = len(all_reviews)
    avg_rating = sum(r["rating"] for r in all_reviews) / total_reviews
    
    await db.users.update_one(
        {"id": review.tasker_id},
        {"$set": {
            "tasker_profile.average_rating": round(avg_rating, 2),
            "tasker_profile.total_reviews": total_reviews
        }}
    )
    
    # Increment completed tasks
    await db.users.update_one(
        {"id": review.tasker_id},
        {"$inc": {"tasker_profile.completed_tasks": 1}}
    )
    
    logger.info(f"Review created for tasker {review.tasker_id}")
    return new_review


@api_router.get("/reviews/tasker/{tasker_id}", response_model=List[Review])
async def get_tasker_reviews(
    tasker_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all reviews for a tasker."""
    reviews = await db.reviews.find(
        {"tasker_id": tasker_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return [Review(**review) for review in reviews]


# ============================================================================
# LOCATION TRACKING ROUTES
# ============================================================================

@api_router.post("/location/update")
async def update_tasker_location(
    location: LocationUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Update tasker's real-time location (tasker only)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(status_code=403, detail="Only taskers can update location")
    
    # Verify task assignment
    task = await db.tasks.find_one({"id": location.task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.get("assigned_tasker_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    # Calculate ETA if task has location
    eta_minutes = None
    if task.get("latitude") and task.get("longitude"):
        distance = calculate_distance(
            location.latitude, location.longitude,
            task["latitude"], task["longitude"]
        )
        eta_minutes = calculate_eta(distance)
    
    # Create or update location record
    location_data = TaskerLocation(
        tasker_id=current_user.id,
        task_id=location.task_id,
        latitude=location.latitude,
        longitude=location.longitude,
        is_en_route=True,
        estimated_arrival_minutes=eta_minutes
    )
    
    await db.tasker_locations.update_one(
        {"tasker_id": current_user.id, "task_id": location.task_id},
        {"$set": location_data.model_dump()},
        upsert=True
    )
    
    return {
        "message": "Location updated",
        "estimated_arrival_minutes": eta_minutes
    }


@api_router.get("/location/tasker/{tasker_id}/task/{task_id}")
async def get_tasker_location(
    tasker_id: str,
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get tasker's current location for a task (client only)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    # Verify task ownership
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if current_user.role == UserRole.CLIENT and task["client_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get location
    location = await db.tasker_locations.find_one(
        {"tasker_id": tasker_id, "task_id": task_id},
        {"_id": 0}
    )
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    return TaskerLocation(**location)


# ============================================================================
# PAYMENT ROUTES
# ============================================================================

@api_router.post("/payments", response_model=Payment, status_code=status.HTTP_201_CREATED)
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


@api_router.post("/payments/{payment_id}/complete")
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


@api_router.get("/payments/task/{task_id}", response_model=List[Payment])
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
# INCLUDE ROUTER & MIDDLEWARE
# ============================================================================

app.include_router(api_router)

# Serve static files (uploads)
app.mount("/uploads", StaticFiles(directory=str(Path(__file__).parent / "uploads")), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "AfricaTask API"}


# ============================================================================
# CHAT ROUTES
# ============================================================================

@api_router.post("/messages", response_model=Message, status_code=status.HTTP_201_CREATED)
async def send_message(
    message: MessageCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Send a message in a task chat."""
    from auth import get_current_user as get_user
    from models import Message
    current_user = await get_user(token, db)
    
    # Get task to determine receiver
    task = await db.tasks.find_one({"id": message.task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Determine receiver based on sender role
    if current_user.role == UserRole.CLIENT:
        if not task.get("assigned_tasker_id"):
            raise HTTPException(status_code=400, detail="Task has no assigned tasker")
        receiver_id = task["assigned_tasker_id"]
    else:
        receiver_id = task["client_id"]
    
    # Create message
    new_message = Message(
        **message.model_dump(),
        sender_id=current_user.id,
        receiver_id=receiver_id
    )
    
    await db.messages.insert_one(new_message.model_dump())
    logger.info(f"Message sent in task {message.task_id}")
    
    return new_message


@api_router.get("/messages/task/{task_id}", response_model=List[Message])
async def get_task_messages(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get all messages for a task."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    # Verify user is part of this task
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if current_user.role == UserRole.CLIENT and task["client_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if current_user.role == UserRole.TASKER and task.get("assigned_tasker_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get messages
    messages = await db.messages.find(
        {"task_id": task_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    # Mark messages as read if current user is receiver
    await db.messages.update_many(
        {
            "task_id": task_id,
            "receiver_id": current_user.id,
            "is_read": False
        },
        {"$set": {"is_read": True}}
    )
    
    return [Message(**msg) for msg in messages]


@api_router.get("/messages/unread")
async def get_unread_count(
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Get unread message count for current user."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    count = await db.messages.count_documents({
        "receiver_id": current_user.id,
        "is_read": False
    })
    
    return {"unread_count": count}


import uuid  # Add at top if not already there

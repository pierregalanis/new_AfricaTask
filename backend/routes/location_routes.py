from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import logging

from models import LocationUpdate, TaskerLocation, UserRole
from auth import get_current_user, oauth2_scheme
from database import get_database
from utils import calculate_distance, calculate_eta

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["location"])


@router.post("/location/update")
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


@router.get("/location/tasker/{tasker_id}/task/{task_id}")
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

@router.post("/tasks/{task_id}/start-tracking")
async def start_gps_tracking(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Start GPS tracking for a task (tasker only)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(status_code=403, detail="Only taskers can start tracking")
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.get("assigned_tasker_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    # Update task with tracking status
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "is_tracking": True,
            "tracking_started_at": datetime.utcnow()
        }}
    )
    
    logger.info(f"GPS tracking started for task {task_id}")
    return {"message": "GPS tracking started", "task_id": task_id}


@router.post("/tasks/{task_id}/stop-tracking")
async def stop_gps_tracking(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Stop GPS tracking for a task (tasker only)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(status_code=403, detail="Only taskers can stop tracking")
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.get("assigned_tasker_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    # Update task to stop tracking
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "is_tracking": False,
            "current_latitude": None,
            "current_longitude": None
        }}
    )
    
    logger.info(f"GPS tracking stopped for task {task_id}")
    return {"message": "GPS tracking stopped"}


@router.post("/tasks/{task_id}/update-location")
async def update_tracking_location(
    task_id: str,
    location_data: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Update tasker's current GPS location during tracking."""
    from auth import get_current_user as get_user
    from math import radians, sin, cos, sqrt, atan2
    
    current_user = await get_user(token, db)
    
    if current_user.role != UserRole.TASKER:
        raise HTTPException(status_code=403, detail="Only taskers can update location")
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.get("assigned_tasker_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    
    if not task.get("is_tracking"):
        raise HTTPException(status_code=400, detail="Tracking not started")
    
    latitude = location_data.get("latitude")
    longitude = location_data.get("longitude")
    
    if not latitude or not longitude:
        raise HTTPException(status_code=400, detail="Latitude and longitude required")
    
    # Calculate distance and ETA
    job_lat = task.get("latitude")
    job_lng = task.get("longitude")
    
    distance_km = None
    eta_minutes = None
    
    if job_lat and job_lng:
        # Haversine formula
        R = 6371  # Earth radius in km
        lat1, lon1 = radians(latitude), radians(longitude)
        lat2, lon2 = radians(job_lat), radians(job_lng)
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        distance_km = R * c
        
        # Estimate ETA (assuming 30 km/h average speed in city)
        avg_speed_kmh = 30
        eta_minutes = int((distance_km / avg_speed_kmh) * 60)
    
    # Update task location
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "current_latitude": latitude,
            "current_longitude": longitude,
            "last_location_update": datetime.utcnow()
        }}
    )
    
    return {
        "message": "Location updated",
        "distance_km": round(distance_km, 2) if distance_km else None,
        "eta_minutes": eta_minutes
    }


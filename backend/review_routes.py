"""
Review Routes for Tasker Reviews & Ratings
Handles review submission, fetching, and rating calculations.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from typing import List
import logging

from database import get_database
from models import User, UserRole, Review, ReviewCreate, TaskerRating

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("", response_model=Review, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """
    Create a review for a tasker.
    Only clients can review taskers after task is completed and paid.
    Reviews must be submitted within 7 days of task completion.
    """
    try:
        # Get current user
        from auth import get_current_user as get_user
        current_user = await get_user(token, db)
        
        # Verify user is a client
        if current_user.role != UserRole.CLIENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only clients can submit reviews"
            )
        
        # Get task details
        task = await db.tasks.find_one({"id": review_data.task_id}, {"_id": 0})
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Verify task belongs to client
        if task.get("client_id") != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only review tasks you booked"
            )
        
        # Verify task is completed and paid
        if task.get("status") != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task must be completed before review"
            )
        
        if not task.get("is_paid"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task must be paid before review"
            )
        
        # Check if review already exists
        existing_review = await db.reviews.find_one({
            "task_id": review_data.task_id,
            "client_id": current_user.id
        }, {"_id": 0})
        
        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already reviewed this task"
            )
        
        # Check 7-day window
        if task.get("completed_at"):
            completed_at = task["completed_at"]
            if isinstance(completed_at, str):
                completed_at = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
            
            days_since_completion = (datetime.utcnow() - completed_at).days
            if days_since_completion > 7:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Review window expired. Reviews must be submitted within 7 days of task completion."
                )
        
        # Create review
        review_dict = review_data.model_dump()
        review_dict["client_id"] = current_user.id
        review_dict["tasker_id"] = task.get("assigned_tasker_id")
        review_dict["client_name"] = current_user.full_name
        review_dict["verified_booking"] = True
        
        review = Review(**review_dict)
        
        await db.reviews.insert_one(review.model_dump())
        
        # Update tasker's rating summary
        await update_tasker_rating(db, task.get("assigned_tasker_id"))
        
        logger.info(f"Review created for task {review_data.task_id} by client {current_user.id}")
        
        return review
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating review: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create review"
        )


@router.get("/tasker/{tasker_id}", response_model=List[Review])
async def get_tasker_reviews(
    tasker_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all verified reviews for a tasker."""
    try:
        reviews = await db.reviews.find(
            {"tasker_id": tasker_id, "verified_booking": True},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return [Review(**review) for review in reviews]
    
    except Exception as e:
        logger.error(f"Error fetching reviews: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch reviews"
        )


@router.get("/tasker/{tasker_id}/rating", response_model=TaskerRating)
async def get_tasker_rating(
    tasker_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get aggregated rating information for a tasker."""
    try:
        # Get all reviews
        reviews = await db.reviews.find(
            {"tasker_id": tasker_id, "verified_booking": True},
            {"_id": 0, "rating": 1}
        ).to_list(1000)
        
        # Get total completed tasks
        completed_tasks_count = await db.tasks.count_documents({
            "assigned_tasker_id": tasker_id,
            "status": "completed",
            "is_paid": True
        })
        
        if not reviews:
            return TaskerRating(
                tasker_id=tasker_id,
                average_rating=0.0,
                total_reviews=0,
                total_completed_tasks=completed_tasks_count,
                rating_distribution={1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            )
        
        # Calculate statistics
        total_reviews = len(reviews)
        total_rating = sum(r["rating"] for r in reviews)
        average_rating = round(total_rating / total_reviews, 1)
        
        # Rating distribution
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for review in reviews:
            rating = review["rating"]
            rating_distribution[rating] = rating_distribution.get(rating, 0) + 1
        
        return TaskerRating(
            tasker_id=tasker_id,
            average_rating=average_rating,
            total_reviews=total_reviews,
            total_completed_tasks=completed_tasks_count,
            rating_distribution=rating_distribution
        )
    
    except Exception as e:
        logger.error(f"Error calculating rating: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate rating"
        )


@router.get("/task/{task_id}/can-review")
async def can_review_task(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Check if current user can review this task."""
    try:
        # Get current user
        from auth import get_current_user as get_user
        current_user = await get_user(token, db)
        
        # Only clients can review
        if current_user.role != UserRole.CLIENT:
            return {
                "can_review": False,
                "reason": "Only clients can review taskers"
            }
        
        # Get task
        task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
        if not task:
            return {"can_review": False, "reason": "Task not found"}
        
        # Check ownership
        if task.get("client_id") != current_user.id:
            return {"can_review": False, "reason": "Not your task"}
        
        # Check if completed and paid
        if task.get("status") != "completed" or not task.get("is_paid"):
            return {"can_review": False, "reason": "Task must be completed and paid"}
        
        # Check if already reviewed
        existing_review = await db.reviews.find_one({
            "task_id": task_id,
            "client_id": current_user.id
        })
        
        if existing_review:
            return {"can_review": False, "reason": "Already reviewed"}
        
        # Check 7-day window
        if task.get("completed_at"):
            completed_at = task["completed_at"]
            if isinstance(completed_at, str):
                completed_at = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
            
            days_since_completion = (datetime.utcnow() - completed_at).days
            if days_since_completion > 7:
                return {
                    "can_review": False,
                    "reason": "Review window expired (7 days limit)"
                }
        
        return {"can_review": True, "reason": "You can review this task"}
    
    except Exception as e:
        logger.error(f"Error checking review eligibility: {str(e)}", exc_info=True)
        return {"can_review": False, "reason": "Error checking eligibility"}


async def update_tasker_rating(db: AsyncIOMotorDatabase, tasker_id: str):
    """Update cached tasker rating in tasker_profiles collection."""
    try:
        rating_info = await get_tasker_rating(tasker_id, db)
        
        await db.tasker_profiles.update_one(
            {"user_id": tasker_id},
            {
                "$set": {
                    "average_rating": rating_info.average_rating,
                    "total_reviews": rating_info.total_reviews,
                    "total_completed_tasks": rating_info.total_completed_tasks,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    except Exception as e:
        logger.error(f"Error updating tasker rating cache: {str(e)}")



@router.get("/client/{client_id}/stats")
async def get_client_stats(
    client_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get stats for a client (total completed tasks)."""
    try:
        # Get total completed & paid tasks as client
        completed_tasks_count = await db.tasks.count_documents({
            "client_id": client_id,
            "status": "completed",
            "is_paid": True
        })
        
        return {
            "client_id": client_id,
            "total_completed_tasks": completed_tasks_count
        }
    
    except Exception as e:
        logger.error(f"Error fetching client stats: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch client stats"
        )




from pydantic import BaseModel

class TranslateRequest(BaseModel):
    text: str
    target_lang: str


@router.post("/translate")
async def translate_review(request: TranslateRequest):
    """
    Translate review text between English and French.
    Supports: 'en' (English) and 'fr' (French)
    """
    try:
        from deep_translator import GoogleTranslator
        
        # Validate target language
        if request.target_lang not in ['en', 'fr']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only 'en' and 'fr' languages are supported"
            )
        
        if not request.text or not request.text.strip():
            return {"translated_text": request.text}
        
        # Translate the text
        translator = GoogleTranslator(source='auto', target=request.target_lang)
        translated_text = translator.translate(request.text)
        
        return {
            "original_text": request.text,
            "translated_text": translated_text,
            "target_lang": request.target_lang
        }
    
    except Exception as e:
        logger.error(f"Translation error: {str(e)}", exc_info=True)
        # Return original text if translation fails
        return {
            "original_text": request.text,
            "translated_text": request.text,
            "target_lang": request.target_lang,
            "error": "Translation service unavailable"
        }


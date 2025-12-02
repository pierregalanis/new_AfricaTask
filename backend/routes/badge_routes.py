from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel
import logging

from database import get_database
from models import UserRole

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/badges", tags=["badges"])


class BadgeType(str):
    VERIFIED = "verified"  # Identity verified
    TOP_RATED = "top_rated"  # Rating >= 4.5 with 10+ reviews
    EXPERIENCED = "experienced"  # 50+ completed tasks
    RELIABLE = "reliable"  # 95%+ completion rate
    FAST_RESPONDER = "fast_responder"  # Quick response time
    CERTIFIED = "certified"  # Has certifications uploaded


class Badge(BaseModel):
    type: str
    name_en: str
    name_fr: str
    description_en: str
    description_fr: str
    icon: str
    color: str
    earned_at: Optional[datetime] = None


BADGE_DEFINITIONS = {
    BadgeType.VERIFIED: Badge(
        type=BadgeType.VERIFIED,
        name_en="Verified",
        name_fr="Vérifié",
        description_en="Identity verified by AfricaTask",
        description_fr="Identité vérifiée par AfricaTask",
        icon="✓",
        color="emerald"
    ),
    BadgeType.TOP_RATED: Badge(
        type=BadgeType.TOP_RATED,
        name_en="Top Rated",
        name_fr="Très bien noté",
        description_en="Maintains 4.5+ rating with 10+ reviews",
        description_fr="Maintient une note de 4.5+ avec 10+ avis",
        icon="⭐",
        color="yellow"
    ),
    BadgeType.EXPERIENCED: Badge(
        type=BadgeType.EXPERIENCED,
        name_en="Experienced Pro",
        name_fr="Professionnel expérimenté",
        description_en="Completed 50+ tasks successfully",
        description_fr="Plus de 50 tâches réussies",
        icon="🏆",
        color="teal"
    ),
    BadgeType.RELIABLE: Badge(
        type=BadgeType.RELIABLE,
        name_en="Reliable",
        name_fr="Fiable",
        description_en="95%+ task completion rate",
        description_fr="Taux de réussite de 95%+",
        icon="💯",
        color="blue"
    ),
    BadgeType.FAST_RESPONDER: Badge(
        type=BadgeType.FAST_RESPONDER,
        name_en="Fast Responder",
        name_fr="Réponse rapide",
        description_en="Quick to respond to bookings",
        description_fr="Répond rapidement aux réservations",
        icon="⚡",
        color="emerald"
    ),
    BadgeType.CERTIFIED: Badge(
        type=BadgeType.CERTIFIED,
        name_en="Certified",
        name_fr="Certifié",
        description_en="Has professional certifications",
        description_fr="Possède des certifications professionnelles",
        icon="📜",
        color="purple"
    )
}


@router.get("/tasker/{tasker_id}", response_model=List[Badge])
async def get_tasker_badges(
    tasker_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all badges earned by a tasker."""
    tasker = await db.users.find_one({"id": tasker_id, "role": "tasker"}, {"_id": 0})
    if not tasker:
        raise HTTPException(status_code=404, detail="Tasker not found")
    
    profile = tasker.get("tasker_profile", {})
    badges = []
    
    # Check Verified badge
    if tasker.get("is_verified"):
        badge = BADGE_DEFINITIONS[BadgeType.VERIFIED].copy()
        badge.earned_at = tasker.get("verified_at")
        badges.append(badge)
    
    # Check Top Rated badge
    if profile.get("average_rating", 0) >= 4.5 and profile.get("total_reviews", 0) >= 10:
        badge = BADGE_DEFINITIONS[BadgeType.TOP_RATED].copy()
        badges.append(badge)
    
    # Check Experienced badge
    if profile.get("completed_tasks", 0) >= 50:
        badge = BADGE_DEFINITIONS[BadgeType.EXPERIENCED].copy()
        badges.append(badge)
    
    # Check Reliable badge (calculate completion rate)
    total_tasks = await db.tasks.count_documents({"assigned_tasker_id": tasker_id})
    completed_tasks = await db.tasks.count_documents({
        "assigned_tasker_id": tasker_id,
        "status": "completed"
    })
    if total_tasks > 0:
        completion_rate = (completed_tasks / total_tasks) * 100
        if completion_rate >= 95 and total_tasks >= 10:
            badge = BADGE_DEFINITIONS[BadgeType.RELIABLE].copy()
            badges.append(badge)
    
    # Check Fast Responder badge (placeholder - would need response time tracking)
    # For now, we'll award it if tasker is available and has good rating
    if profile.get("is_available") and profile.get("average_rating", 0) >= 4.0:
        badge = BADGE_DEFINITIONS[BadgeType.FAST_RESPONDER].copy()
        badges.append(badge)
    
    # Check Certified badge
    if profile.get("certifications") and len(profile.get("certifications", [])) > 0:
        badge = BADGE_DEFINITIONS[BadgeType.CERTIFIED].copy()
        badges.append(badge)
    
    return badges


@router.post("/verify/{tasker_id}")
async def verify_tasker(
    tasker_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Admin endpoint to verify a tasker (award verified badge)."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    # Only admins can verify taskers
    if current_user.email != "admin@africatask.com":
        raise HTTPException(status_code=403, detail="Only admins can verify taskers")
    
    result = await db.users.update_one(
        {"id": tasker_id, "role": "tasker"},
        {"$set": {
            "is_verified": True,
            "verified_at": datetime.utcnow()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tasker not found")
    
    return {"message": "Tasker verified successfully"}


@router.delete("/verify/{tasker_id}")
async def unverify_tasker(
    tasker_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    token: str = Depends(oauth2_scheme)
):
    """Admin endpoint to remove verification from a tasker."""
    from auth import get_current_user as get_user
    current_user = await get_user(token, db)
    
    if current_user.email != "admin@africatask.com":
        raise HTTPException(status_code=403, detail="Only admins can manage verification")
    
    result = await db.users.update_one(
        {"id": tasker_id, "role": "tasker"},
        {"$set": {"is_verified": False}, "$unset": {"verified_at": ""}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tasker not found")
    
    return {"message": "Verification removed successfully"}

from fastapi import FastAPI, APIRouter
from fast api.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

from database import connect_to_mongo, close_mongo_connection
from seed_categories import seed_service_categories

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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup and shutdown events
@app.on_event("startup")
async def startup():
    await connect_to_mongo()
    from database import get_database
    db = await get_database()
    await seed_service_categories(db)
    logger.info("Application started successfully")

@app.on_event("shutdown")
async def shutdown():
    await close_mongo_connection()
    logger.info("Application shutdown complete")

# Include routers
from routes.auth_routes import router as auth_router
app.include_router(auth_router)

from routes.user_routes import router as user_router
app.include_router(user_router)

from routes.category_routes import router as category_router
app.include_router(category_router)

from tasker_routes import router as tasker_router
app.include_router(tasker_router)

from routes.task_routes import router as task_router
app.include_router(task_router)

from routes.location_routes import router as location_router
app.include_router(location_router)

from routes.timer_routes import router as timer_router
app.include_router(timer_router)

from routes.payment_routes import router as payment_router
app.include_router(payment_router)

from routes.review_router import router as review_router
app.include_router(review_router)

from routes.notification_routes import router as notification_router
app.include_router(notification_router)

from routes.message_routes import router as message_router
app.include_router(message_router)

from routes.dispute_routes import router as dispute_router
app.include_router(dispute_router)

from routes.coin_routes import router as coin_router
app.include_router(coin_router)

from routes.scheduled_task_routes import router as scheduled_task_router
app.include_router(scheduled_task_router)

from routes.favorites_routes import router as favorites_router
app.include_router(favorites_router)

from routes.badge_routes import router as badge_router
app.include_router(badge_router)

# Include the main API router
app.include_router(api_router)

# Serve static files (uploads)
app.mount("/uploads", StaticFiles(directory=str(Path(__file__).parent / "uploads")), name="uploads")

# Root endpoint
@app.get("/")
async def root():
    return {"message": "AfricaTask API is running", "version": "1.0.0"}

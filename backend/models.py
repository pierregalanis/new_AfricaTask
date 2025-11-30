from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class UserRole(str, Enum):
    CLIENT = "client"
    TASKER = "tasker"


class TaskStatus(str, Enum):
    POSTED = "posted"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ApplicationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class PaymentMethod(str, Enum):
    CASH = "cash"
    ORANGE_MONEY = "orange_money"
    WAVE = "wave"
    PAYPAL = "paypal"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class Language(str, Enum):
    ENGLISH = "en"
    FRENCH = "fr"


class Country(str, Enum):
    IVORY_COAST = "ivory_coast"
    SENEGAL = "senegal"


# User Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: str
    role: UserRole
    language: Language = Language.FRENCH
    country: Optional[Country] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class UserCreate(UserBase):
    password: str


class TaskerProfile(BaseModel):
    bio: Optional[str] = None
    hourly_rate: float = 0.0  # Required - price per hour in CFA
    service_categories: List[str] = []  # List of category IDs they offer
    certifications: List[str] = []  # File paths
    portfolio_images: List[str] = []  # File paths
    profile_image: Optional[str] = None
    availability: Dict[str, Any] = {}  # e.g., {"monday": ["9:00-17:00"], ...}
    is_available: bool = True  # Currently accepting bookings
    max_travel_distance: Optional[float] = 50.0  # Maximum distance willing to travel in KM
    completed_tasks: int = 0
    average_rating: float = 0.0
    total_reviews: int = 0
    languages_spoken: List[str] = ["fr"]  # ["fr", "en"]


class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    is_verified: bool = False
    
    # Tasker-specific fields
    tasker_profile: Optional[TaskerProfile] = None


class UserInDB(User):
    hashed_password: str


class UserResponse(User):
    pass


# Service Category Models
class ServiceCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name_en: str
    name_fr: str
    icon: str  # Emoji or icon name
    subcategories: List[Dict[str, str]] = []  # [{"en": "...", "fr": "..."}]


# Task Models (Booking Model - TaskRabbit style)
class TaskBase(BaseModel):
    title: str
    description: str
    category_id: str
    subcategory: Optional[str] = None
    duration_hours: float  # How many hours the task will take
    hourly_rate: float  # Agreed hourly rate (from tasker)
    task_date: datetime
    address: str
    city: str
    latitude: float
    longitude: float
    special_instructions: Optional[str] = None


class TaskCreate(TaskBase):
    tasker_id: str  # Instant booking - tasker is selected upfront


class Task(TaskBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    assigned_tasker_id: str  # Always assigned on creation (instant booking)
    status: TaskStatus = TaskStatus.ASSIGNED  # Start as assigned
    total_cost: float  # Calculated: duration_hours * hourly_rate
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    payment_method: Optional[PaymentMethod] = None
    is_paid: bool = False
    
    # GPS Tracking fields
    is_tracking: bool = False
    tracking_started_at: Optional[datetime] = None
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    last_location_update: Optional[datetime] = None
    
    # Job Timer fields
    timer_started_at: Optional[datetime] = None
    timer_stopped_at: Optional[datetime] = None
    actual_hours_worked: Optional[float] = None
    is_timer_running: bool = False


# Task Application Models
class TaskApplicationBase(BaseModel):
    task_id: str
    proposed_rate: float
    estimated_hours: float
    message: Optional[str] = None


class TaskApplicationCreate(TaskApplicationBase):
    pass


class TaskApplication(TaskApplicationBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tasker_id: str
    status: ApplicationStatus = ApplicationStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Review Models
class ReviewBase(BaseModel):
    task_id: str
    tasker_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

    @field_validator('rating')
    @classmethod
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


class ReviewCreate(ReviewBase):
    pass


class Review(ReviewBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Location Tracking Models
class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    task_id: str


class TaskerLocation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tasker_id: str
    task_id: str
    latitude: float
    longitude: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_en_route: bool = True
    estimated_arrival_minutes: Optional[int] = None


# Payment Models
class PaymentBase(BaseModel):
    task_id: str
    amount: float
    payment_method: PaymentMethod


class PaymentCreate(PaymentBase):
    phone_number: Optional[str] = None  # For Orange Money/Wave
    paypal_email: Optional[str] = None  # For PayPal


class Payment(PaymentBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    tasker_id: str
    status: PaymentStatus = PaymentStatus.PENDING
    transaction_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


# Authentication Models
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[str] = None


# Chat Models
class MessageBase(BaseModel):
    task_id: str
    content: str

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    receiver_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_read: bool = False

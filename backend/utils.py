"""Utility functions for the application."""
import os
from pathlib import Path
import uuid
import math
from typing import Tuple
from fastapi import UploadFile
from PIL import Image


# File upload configuration
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Create subdirectories
(UPLOAD_DIR / "profiles").mkdir(exist_ok=True)
(UPLOAD_DIR / "certifications").mkdir(exist_ok=True)
(UPLOAD_DIR / "tasks").mkdir(exist_ok=True)
(UPLOAD_DIR / "portfolios").mkdir(exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_DOC_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


async def save_upload_file(file: UploadFile, upload_type: str = "profiles") -> str:
    """
    Save an uploaded file and return its path.
    
    Args:
        file: The uploaded file
        upload_type: Type of upload (profiles, certifications, tasks, portfolios)
    
    Returns:
        The relative file path
    """
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    
    if upload_type == "certifications":
        if file_ext not in ALLOWED_DOC_EXTENSIONS:
            raise ValueError(f"Invalid file type. Allowed: {ALLOWED_DOC_EXTENSIONS}")
    else:
        if file_ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise ValueError(f"Invalid file type. Allowed: {ALLOWED_IMAGE_EXTENSIONS}")
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / upload_type / unique_filename
    
    # Save file
    contents = await file.read()
    
    # Validate file size
    if len(contents) > MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds {MAX_FILE_SIZE / 1024 / 1024}MB limit")
    
    # Optimize image if it's an image
    if file_ext in ALLOWED_IMAGE_EXTENSIONS:
        try:
            img = Image.open(io.BytesIO(contents))
            # Resize if too large
            max_dimension = 2000
            if max(img.size) > max_dimension:
                img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
            img.save(file_path, optimize=True, quality=85)
        except Exception as e:
            # If image processing fails, save as-is
            with open(file_path, "wb") as f:
                f.write(contents)
    else:
        with open(file_path, "wb") as f:
            f.write(contents)
    
    # Return relative path
    return f"/uploads/{upload_type}/{unique_filename}"


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.
    
    Returns distance in kilometers.
    """
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return distance


def calculate_eta(distance_km: float, speed_kmh: float = 30) -> int:
    """
    Calculate estimated time of arrival in minutes.
    
    Args:
        distance_km: Distance in kilometers
        speed_kmh: Average speed in km/h (default: 30 km/h for city traffic)
    
    Returns:
        ETA in minutes
    """
    hours = distance_km / speed_kmh
    minutes = int(hours * 60)
    return minutes


import io  # Add this import at the top

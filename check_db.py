#!/usr/bin/env python3
"""
Check and clean database for testing
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def check_and_clean_db():
    # Connect to MongoDB
    mongo_url = "mongodb://localhost:27017"
    db_name = "test_database"
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=== Checking Database ===")
    
    # Check tasks
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(100)
    print(f"Found {len(tasks)} tasks in database")
    
    for i, task in enumerate(tasks):
        print(f"Task {i+1}:")
        print(f"  ID: {task.get('id', 'MISSING')}")
        print(f"  Title: {task.get('title', 'MISSING')}")
        print(f"  Duration Hours: {task.get('duration_hours', 'MISSING')}")
        print(f"  Hourly Rate: {task.get('hourly_rate', 'MISSING')}")
        print(f"  Assigned Tasker ID: {task.get('assigned_tasker_id', 'MISSING')}")
        print(f"  Total Cost: {task.get('total_cost', 'MISSING')}")
        print(f"  Status: {task.get('status', 'MISSING')}")
        print()
    
    # Clean up invalid tasks
    if tasks:
        print("Cleaning up invalid tasks...")
        result = await db.tasks.delete_many({})
        print(f"Deleted {result.deleted_count} tasks")
    
    # Check users
    users = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(100)
    print(f"Found {len(users)} users in database")
    
    for user in users:
        print(f"User: {user.get('email')} - Role: {user.get('role')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_and_clean_db())
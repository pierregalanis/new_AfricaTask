"""
Script to fix existing task pricing in the database.
Run this once to recalculate total_cost for all existing tasks.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def fix_task_pricing():
    # Connect to MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.taskrabbit_db
    
    print("🔄 Fetching all tasks...")
    tasks = await db.tasks.find({}).to_list(None)
    
    print(f"📊 Found {len(tasks)} tasks to check")
    
    fixed_count = 0
    for task in tasks:
        task_id = task.get('id')
        pricing_type = task.get('pricing_type', 'hourly')
        
        # Calculate correct total_cost
        if pricing_type == 'fixed':
            correct_cost = task.get('fixed_price', 0)
        else:
            duration = task.get('duration_hours', 0)
            rate = task.get('hourly_rate', 0)
            correct_cost = duration * rate
        
        current_cost = task.get('total_cost', 0)
        
        # Update if different
        if abs(correct_cost - current_cost) > 0.01:  # Allow for floating point differences
            print(f"  ⚠️  Task {task_id[:8]}... - Fixing: {current_cost} → {correct_cost} CFA")
            print(f"       Type: {pricing_type}, Duration: {task.get('duration_hours')}h, Rate: {task.get('hourly_rate')}, Fixed: {task.get('fixed_price')}")
            
            await db.tasks.update_one(
                {'id': task_id},
                {'$set': {'total_cost': correct_cost}}
            )
            fixed_count += 1
        else:
            print(f"  ✅ Task {task_id[:8]}... - Already correct: {correct_cost} CFA")
    
    print(f"\n✅ Fixed {fixed_count} tasks")
    print(f"✅ {len(tasks) - fixed_count} tasks were already correct")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_task_pricing())

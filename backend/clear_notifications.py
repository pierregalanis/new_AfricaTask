"""
Script to clear all notifications from the database.
Run this once to remove old notifications that don't have proper message field.
Users will then get fresh notifications with complete data.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def clear_notifications():
    # Connect to MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.taskrabbit_db
    
    print("🔄 Counting notifications...")
    count = await db.notifications.count_documents({})
    
    print(f"📊 Found {count} notifications")
    
    if count > 0:
        # Delete all notifications
        result = await db.notifications.delete_many({})
        print(f"✅ Deleted {result.deleted_count} notifications")
        print("💡 New notifications will have complete message data")
    else:
        print("✅ No notifications to delete")
    
    client.close()

if __name__ == "__main__":
    print("⚠️  WARNING: This will delete ALL notifications from the database!")
    print("This is necessary to fix the empty notification issue.")
    print("Users will receive fresh notifications with complete data after this.\n")
    
    confirm = input("Type 'yes' to proceed: ")
    if confirm.lower() == 'yes':
        asyncio.run(clear_notifications())
    else:
        print("❌ Cancelled")

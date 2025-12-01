#!/usr/bin/env python3
"""
Simple WebSocket connectivity test
"""

import asyncio
import websockets
import json
import requests
import time

# Configuration
BACKEND_URL = "https://quick-task-6.preview.emergentagent.com/api"
WS_URL = "wss://taskafy.preview.emergentagent.com"

CLIENT_CREDENTIALS = {
    "username": "client@test.com",
    "password": "test123"
}

async def test_websocket_connection():
    """Test basic WebSocket connection"""
    print("Testing WebSocket connection...")
    
    # Get authentication
    response = requests.post(f"{BACKEND_URL}/auth/login", data=CLIENT_CREDENTIALS)
    if response.status_code != 200:
        print("❌ Authentication failed")
        return False
        
    token = response.json()["access_token"]
    
    # Get user ID
    response = requests.get(f"{BACKEND_URL}/auth/me", 
                          headers={"Authorization": f"Bearer {token}"})
    user_id = response.json()["id"]
    
    print(f"✅ Authenticated as user: {user_id}")
    
    # Test WebSocket connection
    ws_url = f"{WS_URL}/ws/chat/test-task/{user_id}"
    print(f"Connecting to: {ws_url}")
    
    try:
        # Set a longer timeout for connection
        async with websockets.connect(ws_url) as websocket:
            print("✅ WebSocket connected successfully!")
            
            # Send a test message
            test_message = {
                "content": "Test message",
                "receiver_id": "test-receiver"
            }
            
            await websocket.send(json.dumps(test_message))
            print("📤 Test message sent")
            
            # Try to receive a response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                print(f"📨 Received response: {response}")
                return True
            except asyncio.TimeoutError:
                print("⏰ No response received (timeout)")
                return True  # Connection worked, just no response
                
    except websockets.exceptions.InvalidStatus as e:
        print(f"❌ WebSocket connection failed with status: {e}")
        return False
    except websockets.exceptions.ConnectionClosed as e:
        print(f"❌ WebSocket connection closed: {e}")
        return False
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        return False

async def main():
    success = await test_websocket_connection()
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
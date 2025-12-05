#!/usr/bin/env python3
"""
Test HTTP message API as fallback
"""

import requests
import json

# Configuration
BACKEND_URL = "https://taskbuddyafrica.preview.emergentagent.com/api"
TASK_ID = "chat-test-task-active-001"

CLIENT_CREDENTIALS = {
    "username": "client@test.com",
    "password": "test123"
}

TASKER_CREDENTIALS = {
    "username": "tasker@test.com", 
    "password": "test123"
}

def test_http_messages():
    """Test HTTP message API"""
    print("Testing HTTP Message API...")
    
    # Client authentication
    response = requests.post(f"{BACKEND_URL}/auth/login", data=CLIENT_CREDENTIALS)
    if response.status_code != 200:
        print("❌ Client authentication failed")
        return False
        
    client_token = response.json()["access_token"]
    print("✅ Client authenticated")
    
    # Tasker authentication
    response = requests.post(f"{BACKEND_URL}/auth/login", data=TASKER_CREDENTIALS)
    if response.status_code != 200:
        print("❌ Tasker authentication failed")
        return False
        
    tasker_token = response.json()["access_token"]
    print("✅ Tasker authenticated")
    
    # Send message from client
    message_data = {
        "task_id": TASK_ID,
        "content": "HTTP API test message from client"
    }
    
    response = requests.post(
        f"{BACKEND_URL}/messages",
        json=message_data,
        headers={
            "Authorization": f"Bearer {client_token}",
            "Content-Type": "application/json"
        }
    )
    
    if response.status_code != 201:
        print(f"❌ Failed to send message: {response.status_code} - {response.text}")
        return False
        
    print("✅ Client message sent via HTTP")
    
    # Fetch messages as tasker
    response = requests.get(
        f"{BACKEND_URL}/messages/task/{TASK_ID}",
        headers={"Authorization": f"Bearer {tasker_token}"}
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch messages: {response.status_code}")
        return False
        
    messages = response.json()
    test_message_found = any(
        "HTTP API test message from client" in msg.get('content', '')
        for msg in messages
    )
    
    if test_message_found:
        print("✅ Message successfully retrieved by tasker")
        print(f"📊 Total messages in chat: {len(messages)}")
        return True
    else:
        print("❌ Test message not found in chat")
        return False

if __name__ == "__main__":
    success = test_http_messages()
    exit(0 if success else 1)
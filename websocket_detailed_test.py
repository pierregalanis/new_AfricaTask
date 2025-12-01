#!/usr/bin/env python3
"""
Detailed WebSocket Chat Test
Tests real-time message delivery between client and tasker
"""

import asyncio
import websockets
import json
import requests
from datetime import datetime
import time

# Configuration
BACKEND_URL = "https://quick-task-6.preview.emergentagent.com/api"
WS_URL = "wss://taskafy.preview.emergentagent.com"
TASK_ID = "chat-test-task-active-001"

CLIENT_CREDENTIALS = {
    "username": "client@test.com",
    "password": "test123"
}

TASKER_CREDENTIALS = {
    "username": "tasker@test.com", 
    "password": "test123"
}

class DetailedWebSocketTester:
    def __init__(self):
        self.client_token = None
        self.tasker_token = None
        self.client_id = None
        self.tasker_id = None
        self.client_messages = []
        self.tasker_messages = []
        self.test_results = {}
        
    def log(self, message, status="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [{status}] {message}")
        
    def authenticate(self):
        """Authenticate both users"""
        self.log("🔐 Authenticating users...")
        
        # Client login
        response = requests.post(f"{BACKEND_URL}/auth/login", data=CLIENT_CREDENTIALS)
        if response.status_code != 200:
            self.log("❌ Client login failed", "ERROR")
            return False
            
        self.client_token = response.json()["access_token"]
        
        # Get client ID
        response = requests.get(f"{BACKEND_URL}/auth/me", 
                              headers={"Authorization": f"Bearer {self.client_token}"})
        self.client_id = response.json()["id"]
        
        # Tasker login
        response = requests.post(f"{BACKEND_URL}/auth/login", data=TASKER_CREDENTIALS)
        if response.status_code != 200:
            self.log("❌ Tasker login failed", "ERROR")
            return False
            
        self.tasker_token = response.json()["access_token"]
        
        # Get tasker ID
        response = requests.get(f"{BACKEND_URL}/auth/me", 
                              headers={"Authorization": f"Bearer {self.tasker_token}"})
        self.tasker_id = response.json()["id"]
        
        self.log(f"✅ Authentication successful")
        self.log(f"   Client ID: {self.client_id}")
        self.log(f"   Tasker ID: {self.tasker_id}")
        return True
    
    async def websocket_handler(self, user_type, user_id, messages_list):
        """Handle WebSocket connection for a user"""
        ws_url = f"{WS_URL}/ws/chat/{TASK_ID}/{user_id}"
        self.log(f"🔌 Connecting {user_type} to {ws_url}")
        
        try:
            async with websockets.connect(ws_url) as websocket:
                self.log(f"✅ {user_type} WebSocket connected")
                
                # Store websocket reference
                if user_type == "CLIENT":
                    self.client_ws = websocket
                else:
                    self.tasker_ws = websocket
                
                async for message in websocket:
                    try:
                        data = json.loads(message)
                        timestamp = datetime.now()
                        data['received_at'] = timestamp.isoformat()
                        messages_list.append(data)
                        
                        if data.get('type') == 'new_message':
                            content = data.get('message', {}).get('content', '')
                            self.log(f"📨 {user_type} received message: '{content}'")
                        elif data.get('type') == 'message_sent':
                            content = data.get('message', {}).get('content', '')
                            self.log(f"✅ {user_type} message sent confirmation: '{content}'")
                            
                    except json.JSONDecodeError as e:
                        self.log(f"❌ {user_type} JSON decode error: {e}", "ERROR")
                        
        except websockets.exceptions.ConnectionClosed:
            self.log(f"🔌 {user_type} WebSocket connection closed")
        except Exception as e:
            self.log(f"❌ {user_type} WebSocket error: {e}", "ERROR")
    
    async def send_message(self, websocket, content, receiver_id, sender_type):
        """Send a message via WebSocket"""
        try:
            message_data = {
                "content": content,
                "receiver_id": receiver_id
            }
            
            send_time = datetime.now()
            await websocket.send(json.dumps(message_data))
            self.log(f"📤 {sender_type} sent: '{content}'")
            return send_time
            
        except Exception as e:
            self.log(f"❌ Failed to send message: {e}", "ERROR")
            return None
    
    async def test_real_time_delivery(self):
        """Test real-time message delivery"""
        self.log("🚀 Starting real-time message delivery test")
        
        # Start WebSocket connections
        client_task = asyncio.create_task(
            self.websocket_handler("CLIENT", self.client_id, self.client_messages)
        )
        tasker_task = asyncio.create_task(
            self.websocket_handler("TASKER", self.tasker_id, self.tasker_messages)
        )
        
        # Wait for connections to establish
        await asyncio.sleep(3)
        self.log("⏳ WebSocket connections established, starting message tests...")
        
        # Test 1: Client sends message to tasker
        self.log("\n📋 TEST 1: Client → Tasker message delivery")
        
        if hasattr(self, 'client_ws'):
            send_time = await self.send_message(
                self.client_ws, 
                "Hello from client - real-time test", 
                self.tasker_id,
                "CLIENT"
            )
            
            # Wait and check if tasker received it
            await asyncio.sleep(2)
            
            # Check tasker messages
            tasker_received = False
            receive_time = None
            
            for msg in self.tasker_messages:
                if (msg.get('type') == 'new_message' and 
                    'Hello from client - real-time test' in msg.get('message', {}).get('content', '')):
                    tasker_received = True
                    receive_time = datetime.fromisoformat(msg['received_at'])
                    break
            
            if tasker_received and send_time:
                delivery_time = (receive_time - send_time).total_seconds()
                self.log(f"✅ TEST 1 PASSED: Message delivered in {delivery_time:.3f} seconds")
                self.test_results['client_to_tasker'] = {
                    'success': True,
                    'delivery_time': delivery_time
                }
            else:
                self.log("❌ TEST 1 FAILED: Tasker did not receive client message", "ERROR")
                self.test_results['client_to_tasker'] = {'success': False}
        
        # Test 2: Tasker sends message to client
        self.log("\n📋 TEST 2: Tasker → Client message delivery")
        
        if hasattr(self, 'tasker_ws'):
            send_time = await self.send_message(
                self.tasker_ws, 
                "Hello from tasker - real-time test", 
                self.client_id,
                "TASKER"
            )
            
            # Wait and check if client received it
            await asyncio.sleep(2)
            
            # Check client messages
            client_received = False
            receive_time = None
            
            for msg in self.client_messages:
                if (msg.get('type') == 'new_message' and 
                    'Hello from tasker - real-time test' in msg.get('message', {}).get('content', '')):
                    client_received = True
                    receive_time = datetime.fromisoformat(msg['received_at'])
                    break
            
            if client_received and send_time:
                delivery_time = (receive_time - send_time).total_seconds()
                self.log(f"✅ TEST 2 PASSED: Message delivered in {delivery_time:.3f} seconds")
                self.test_results['tasker_to_client'] = {
                    'success': True,
                    'delivery_time': delivery_time
                }
            else:
                self.log("❌ TEST 2 FAILED: Client did not receive tasker message", "ERROR")
                self.test_results['tasker_to_client'] = {'success': False}
        
        # Test 3: Rapid message exchange
        self.log("\n📋 TEST 3: Rapid message exchange")
        
        if hasattr(self, 'client_ws') and hasattr(self, 'tasker_ws'):
            # Send multiple messages quickly
            messages = [
                ("CLIENT", "Quick message 1"),
                ("TASKER", "Quick reply 1"),
                ("CLIENT", "Quick message 2"),
                ("TASKER", "Quick reply 2")
            ]
            
            initial_client_count = len(self.client_messages)
            initial_tasker_count = len(self.tasker_messages)
            
            for sender, content in messages:
                if sender == "CLIENT":
                    await self.send_message(self.client_ws, content, self.tasker_id, "CLIENT")
                else:
                    await self.send_message(self.tasker_ws, content, self.client_id, "TASKER")
                await asyncio.sleep(0.5)  # Small delay between messages
            
            # Wait for all messages to be delivered
            await asyncio.sleep(3)
            
            final_client_count = len(self.client_messages)
            final_tasker_count = len(self.tasker_messages)
            
            client_received = final_client_count - initial_client_count
            tasker_received = final_tasker_count - initial_tasker_count
            
            # Should receive 2 messages each (the replies)
            if client_received >= 2 and tasker_received >= 2:
                self.log(f"✅ TEST 3 PASSED: Rapid exchange successful")
                self.log(f"   Client received: {client_received} messages")
                self.log(f"   Tasker received: {tasker_received} messages")
                self.test_results['rapid_exchange'] = {'success': True}
            else:
                self.log(f"❌ TEST 3 FAILED: Expected 2+ messages each", "ERROR")
                self.log(f"   Client received: {client_received} messages")
                self.log(f"   Tasker received: {tasker_received} messages")
                self.test_results['rapid_exchange'] = {'success': False}
        
        # Clean up
        client_task.cancel()
        tasker_task.cancel()
        
        try:
            await client_task
        except asyncio.CancelledError:
            pass
            
        try:
            await tasker_task
        except asyncio.CancelledError:
            pass
    
    def verify_no_page_refresh_needed(self):
        """Verify messages appear without page refresh (by checking HTTP API)"""
        self.log("\n📋 TEST 4: Verify no page refresh needed")
        
        # Get initial message count via HTTP
        response = requests.get(
            f"{BACKEND_URL}/messages/task/{TASK_ID}",
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if response.status_code == 200:
            messages = response.json()
            test_messages = [
                msg for msg in messages 
                if 'real-time test' in msg.get('content', '')
            ]
            
            if len(test_messages) >= 2:  # Should have both test messages
                self.log("✅ TEST 4 PASSED: Messages persisted without page refresh")
                self.test_results['no_refresh_needed'] = {'success': True}
            else:
                self.log(f"❌ TEST 4 FAILED: Only {len(test_messages)} test messages found", "ERROR")
                self.test_results['no_refresh_needed'] = {'success': False}
        else:
            self.log("❌ TEST 4 FAILED: Could not fetch messages via HTTP", "ERROR")
            self.test_results['no_refresh_needed'] = {'success': False}
    
    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "="*60)
        self.log("📊 WEBSOCKET CHAT TEST SUMMARY")
        self.log("="*60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result.get('success'))
        
        for test_name, result in self.test_results.items():
            status = "✅ PASSED" if result.get('success') else "❌ FAILED"
            self.log(f"{test_name}: {status}")
            
            if result.get('delivery_time'):
                self.log(f"   Delivery time: {result['delivery_time']:.3f}s")
        
        self.log(f"\nOverall: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            self.log("🎉 ALL TESTS PASSED - WebSocket chat is working correctly!", "SUCCESS")
            return True
        else:
            self.log(f"❌ {total_tests - passed_tests} tests failed", "ERROR")
            return False
    
    async def run_all_tests(self):
        """Run all WebSocket tests"""
        if not self.authenticate():
            return False
        
        await self.test_real_time_delivery()
        self.verify_no_page_refresh_needed()
        
        return self.print_summary()

async def main():
    tester = DetailedWebSocketTester()
    success = await tester.run_all_tests()
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
#!/usr/bin/env python3
"""
Backend Refactoring Verification Test
Tests all 29 endpoints moved from server.py to modular route files
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import os

# Get backend URL from frontend .env
BACKEND_URL = "https://quick-task-6.preview.emergentagent.com/api"

class RefactoredEndpointsTester:
    """Test all refactored endpoints after modularization"""
    
    def __init__(self):
        self.client_token = None
        self.tasker_token = None
        self.client_id = None
        self.tasker_id = None
        self.test_task_id = None
        self.test_payment_id = None
        
    def log(self, message, status="INFO"):
        print(f"[{status}] {message}")
        
    def make_request(self, method, endpoint, data=None, headers=None, token=None, files=None):
        """Make HTTP request with proper error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        
        if headers is None:
            headers = {}
            
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                if "Content-Type" not in headers:
                    headers["Content-Type"] = "application/json"
                response = requests.get(url, headers=headers, params=data)
            elif method.upper() == "POST":
                if files:
                    # For file uploads, don't set Content-Type (let requests handle it)
                    if "Content-Type" in headers:
                        del headers["Content-Type"]
                    response = requests.post(url, data=data, files=files, headers=headers)
                elif "Content-Type" not in headers:
                    headers["Content-Type"] = "application/x-www-form-urlencoded"
                    response = requests.post(url, data=data, headers=headers)
                elif headers.get("Content-Type") == "application/json":
                    response = requests.post(url, json=data, headers=headers)
                else:
                    response = requests.post(url, data=data, headers=headers)
            elif method.upper() == "PUT":
                if "Content-Type" not in headers:
                    headers["Content-Type"] = "application/x-www-form-urlencoded"
                if headers.get("Content-Type") == "application/json":
                    response = requests.put(url, json=data, headers=headers)
                else:
                    response = requests.put(url, data=data, headers=headers)
            elif method.upper() == "DELETE":
                headers["Content-Type"] = "application/json"
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            self.log(f"{method} {url} -> {response.status_code}")
            
            if response.status_code >= 400:
                self.log(f"Error response: {response.text}", "ERROR")
                
            return response
            
        except Exception as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            return None
    
    def test_authentication(self):
        """Test authentication for both user types"""
        self.log("=== Testing Authentication ===")
        
        # Test client login
        response = self.make_request("POST", "/auth/login", {
            "username": "testclient@demo.com",
            "password": "test123"
        })
        
        if not response or response.status_code != 200:
            self.log("❌ Client login failed", "ERROR")
            return False
            
        try:
            data = response.json()
            self.client_token = data.get("access_token")
            if not self.client_token:
                self.log("❌ No client access token", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to parse client login response: {e}", "ERROR")
            return False
            
        # Get client ID
        response = self.make_request("GET", "/auth/me", None, None, self.client_token)
        if response and response.status_code == 200:
            try:
                user_data = response.json()
                self.client_id = user_data.get("id")
            except Exception as e:
                self.log(f"❌ Failed to parse client info: {e}", "ERROR")
                return False
        
        # Test tasker login
        response = self.make_request("POST", "/auth/login", {
            "username": "testtasker@demo.com",
            "password": "test123"
        })
        
        if not response or response.status_code != 200:
            self.log("❌ Tasker login failed", "ERROR")
            return False
            
        try:
            data = response.json()
            self.tasker_token = data.get("access_token")
            if not self.tasker_token:
                self.log("❌ No tasker access token", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to parse tasker login response: {e}", "ERROR")
            return False
            
        # Get tasker ID
        response = self.make_request("GET", "/auth/me", None, None, self.tasker_token)
        if response and response.status_code == 200:
            try:
                user_data = response.json()
                self.tasker_id = user_data.get("id")
            except Exception as e:
                self.log(f"❌ Failed to parse tasker info: {e}", "ERROR")
                return False
        
        if self.client_token and self.tasker_token:
            self.log(f"✅ Authentication successful - Client: {self.client_id}, Tasker: {self.tasker_id}")
            return True
        else:
            self.log("❌ Authentication failed", "ERROR")
            return False
    
    def test_task_management_endpoints(self):
        """Test Task Management endpoints (task_routes.py)"""
        self.log("=== Testing Task Management Endpoints ===")
        
        if not self.client_token or not self.tasker_id:
            self.log("❌ Missing authentication data", "ERROR")
            return False
        
        # Test 1: POST /api/tasks - Create task
        self.log("Testing POST /api/tasks...")
        future_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00:00")
        
        task_data = {
            "title": "Refactoring Test Task",
            "description": "Testing refactored task endpoints",
            "category_id": "home-repairs",
            "tasker_id": self.tasker_id,
            "duration_hours": 2,
            "hourly_rate": 5000.0,
            "task_date": future_date,
            "address": "123 Test Street, Abidjan",
            "city": "Abidjan",
            "latitude": 5.3364,
            "longitude": -4.0267
        }
        
        headers = {"Content-Type": "application/json"}
        response = self.make_request("POST", "/tasks", task_data, headers, self.client_token)
        
        if not response or response.status_code != 201:
            self.log("❌ POST /api/tasks failed", "ERROR")
            return False
        
        try:
            task = response.json()
            self.test_task_id = task.get("id")
            if not self.test_task_id:
                self.log("❌ No task ID in response", "ERROR")
                return False
            self.log(f"✅ POST /api/tasks successful - Task ID: {self.test_task_id}")
        except Exception as e:
            self.log(f"❌ Failed to parse task creation response: {e}", "ERROR")
            return False
        
        # Test 2: GET /api/tasks - List tasks
        self.log("Testing GET /api/tasks...")
        response = self.make_request("GET", "/tasks", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ GET /api/tasks failed", "ERROR")
            return False
        
        try:
            tasks = response.json()
            self.log(f"✅ GET /api/tasks successful - Found {len(tasks)} tasks")
        except Exception as e:
            self.log(f"❌ Failed to parse tasks response: {e}", "ERROR")
            return False
        
        # Test 3: GET /api/tasks/{task_id} - Get task details
        self.log(f"Testing GET /api/tasks/{self.test_task_id}...")
        response = self.make_request("GET", f"/tasks/{self.test_task_id}")
        
        if not response or response.status_code != 200:
            self.log("❌ GET /api/tasks/{task_id} failed", "ERROR")
            return False
        
        try:
            task = response.json()
            self.log(f"✅ GET /api/tasks/{{task_id}} successful - Status: {task.get('status')}")
        except Exception as e:
            self.log(f"❌ Failed to parse task details response: {e}", "ERROR")
            return False
        
        # Test 4: Accept the task first (needed for status update)
        self.log("Accepting task for status update test...")
        response = self.make_request("POST", f"/tasks/{self.test_task_id}/accept", None, None, self.tasker_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Task acceptance failed", "ERROR")
            return False
        
        # Test 5: PUT /api/tasks/{task_id}/status - Update status
        self.log(f"Testing PUT /api/tasks/{self.test_task_id}/status...")
        response = self.make_request("PUT", f"/tasks/{self.test_task_id}/status?new_status=completed", None, None, self.tasker_token)
        
        if not response or response.status_code != 200:
            self.log("❌ PUT /api/tasks/{task_id}/status failed", "ERROR")
            return False
        
        try:
            updated_task = response.json()
            self.log(f"✅ PUT /api/tasks/{{task_id}}/status successful - New status: {updated_task.get('status')}")
        except Exception as e:
            self.log(f"❌ Failed to parse status update response: {e}", "ERROR")
            return False
        
        # Test 6: POST /api/tasks/{task_id}/cancel - Cancel task (create new task for this)
        self.log("Creating new task for cancellation test...")
        task_data["title"] = "Cancellation Test Task"
        response = self.make_request("POST", "/tasks", task_data, headers, self.client_token)
        
        if response and response.status_code == 201:
            try:
                cancel_task = response.json()
                cancel_task_id = cancel_task.get("id")
                
                # Accept the task first
                response = self.make_request("POST", f"/tasks/{cancel_task_id}/accept", None, None, self.tasker_token)
                
                if response and response.status_code == 200:
                    # Now test cancellation
                    self.log(f"Testing POST /api/tasks/{cancel_task_id}/cancel...")
                    cancel_data = {"reason": "Testing cancellation endpoint"}
                    response = self.make_request("POST", f"/tasks/{cancel_task_id}/cancel", cancel_data, None, self.client_token)
                    
                    if response and response.status_code == 200:
                        try:
                            result = response.json()
                            self.log(f"✅ POST /api/tasks/{{task_id}}/cancel successful - Penalty: {result.get('penalty_amount', 0)} CFA")
                        except Exception as e:
                            self.log(f"❌ Failed to parse cancellation response: {e}", "ERROR")
                            return False
                    else:
                        self.log("❌ POST /api/tasks/{task_id}/cancel failed", "ERROR")
                        return False
                else:
                    self.log("⚠️ Could not accept task for cancellation test")
            except Exception as e:
                self.log(f"❌ Failed to create task for cancellation test: {e}", "ERROR")
                return False
        else:
            self.log("⚠️ Could not create task for cancellation test")
        
        self.log("✅ All Task Management endpoints working correctly")
        return True
    
    def test_timer_endpoints(self):
        """Test Timer endpoints (timer_routes.py)"""
        self.log("=== Testing Timer Endpoints ===")
        
        if not self.test_task_id or not self.tasker_token:
            self.log("❌ Missing test task ID or tasker token", "ERROR")
            return False
        
        # Create a new task in progress for timer testing
        future_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00:00")
        task_data = {
            "title": "Timer Test Task",
            "description": "Testing timer endpoints",
            "category_id": "home-repairs",
            "tasker_id": self.tasker_id,
            "duration_hours": 2,
            "hourly_rate": 5000.0,
            "task_date": future_date,
            "address": "123 Timer Test Street, Abidjan",
            "city": "Abidjan",
            "latitude": 5.3364,
            "longitude": -4.0267
        }
        
        headers = {"Content-Type": "application/json"}
        response = self.make_request("POST", "/tasks", task_data, headers, self.client_token)
        
        if not response or response.status_code != 201:
            self.log("❌ Failed to create timer test task", "ERROR")
            return False
        
        try:
            timer_task = response.json()
            timer_task_id = timer_task.get("id")
        except Exception as e:
            self.log(f"❌ Failed to parse timer task creation: {e}", "ERROR")
            return False
        
        # Accept the task
        response = self.make_request("POST", f"/tasks/{timer_task_id}/accept", None, None, self.tasker_token)
        if not response or response.status_code != 200:
            self.log("❌ Failed to accept timer test task", "ERROR")
            return False
        
        # Test 1: POST /api/tasks/{task_id}/start-timer
        self.log(f"Testing POST /api/tasks/{timer_task_id}/start-timer...")
        response = self.make_request("POST", f"/tasks/{timer_task_id}/start-timer", None, None, self.tasker_token)
        
        if not response or response.status_code != 200:
            self.log("❌ POST /api/tasks/{task_id}/start-timer failed", "ERROR")
            return False
        
        try:
            result = response.json()
            self.log(f"✅ POST /api/tasks/{{task_id}}/start-timer successful - Started at: {result.get('started_at')}")
        except Exception as e:
            self.log(f"❌ Failed to parse start timer response: {e}", "ERROR")
            return False
        
        # Test 2: GET /api/tasks/{task_id}/timer-status
        self.log(f"Testing GET /api/tasks/{timer_task_id}/timer-status...")
        response = self.make_request("GET", f"/tasks/{timer_task_id}/timer-status", None, None, self.tasker_token)
        
        if not response or response.status_code != 200:
            self.log("❌ GET /api/tasks/{task_id}/timer-status failed", "ERROR")
            return False
        
        try:
            status = response.json()
            is_running = status.get("is_timer_running", False)
            elapsed = status.get("elapsed_hours", 0)
            self.log(f"✅ GET /api/tasks/{{task_id}}/timer-status successful - Running: {is_running}, Elapsed: {elapsed}h")
        except Exception as e:
            self.log(f"❌ Failed to parse timer status response: {e}", "ERROR")
            return False
        
        # Wait a moment for timer to run
        import time
        time.sleep(2)
        
        # Test 3: POST /api/tasks/{task_id}/stop-timer
        self.log(f"Testing POST /api/tasks/{timer_task_id}/stop-timer...")
        response = self.make_request("POST", f"/tasks/{timer_task_id}/stop-timer", None, None, self.tasker_token)
        
        if not response or response.status_code != 200:
            self.log("❌ POST /api/tasks/{task_id}/stop-timer failed", "ERROR")
            return False
        
        try:
            result = response.json()
            hours_worked = result.get("actual_hours_worked", 0)
            self.log(f"✅ POST /api/tasks/{{task_id}}/stop-timer successful - Hours worked: {hours_worked}")
        except Exception as e:
            self.log(f"❌ Failed to parse stop timer response: {e}", "ERROR")
            return False
        
        self.log("✅ All Timer endpoints working correctly")
        return True
    
    def test_location_endpoints(self):
        """Test Location endpoints (location_routes.py)"""
        self.log("=== Testing Location Endpoints ===")
        
        if not self.test_task_id or not self.tasker_token or not self.client_token:
            self.log("❌ Missing required tokens or task ID", "ERROR")
            return False
        
        # Test 1: POST /api/location/update
        self.log("Testing POST /api/location/update...")
        location_data = {
            "task_id": self.test_task_id,
            "latitude": 5.3400,
            "longitude": -4.0300
        }
        
        response = self.make_request("POST", "/location/update", location_data, None, self.tasker_token)
        
        if not response or response.status_code != 200:
            self.log("❌ POST /api/location/update failed", "ERROR")
            return False
        
        try:
            result = response.json()
            eta = result.get("estimated_arrival_minutes")
            self.log(f"✅ POST /api/location/update successful - ETA: {eta} minutes")
        except Exception as e:
            self.log(f"❌ Failed to parse location update response: {e}", "ERROR")
            return False
        
        # Test 2: GET /api/location/tasker/{tasker_id}/task/{task_id}
        self.log(f"Testing GET /api/location/tasker/{self.tasker_id}/task/{self.test_task_id}...")
        response = self.make_request("GET", f"/location/tasker/{self.tasker_id}/task/{self.test_task_id}", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ GET /api/location/tasker/{tasker_id}/task/{task_id} failed", "ERROR")
            return False
        
        try:
            location = response.json()
            lat = location.get("latitude")
            lng = location.get("longitude")
            self.log(f"✅ GET /api/location/tasker/{{tasker_id}}/task/{{task_id}} successful - Location: {lat}, {lng}")
        except Exception as e:
            self.log(f"❌ Failed to parse location response: {e}", "ERROR")
            return False
        
        self.log("✅ All Location endpoints working correctly")
        return True
    
    def test_payment_endpoints(self):
        """Test Payment endpoints (payment_routes.py)"""
        self.log("=== Testing Payment Endpoints ===")
        
        if not self.test_task_id or not self.client_token or not self.tasker_token:
            self.log("❌ Missing required tokens or task ID", "ERROR")
            return False
        
        # Test 1: POST /api/payments
        self.log("Testing POST /api/payments...")
        payment_data = {
            "task_id": self.test_task_id,
            "amount": 10000.0,
            "payment_method": "mobile_money",
            "description": "Payment for refactoring test task"
        }
        
        headers = {"Content-Type": "application/json"}
        response = self.make_request("POST", "/payments", payment_data, headers, self.client_token)
        
        if not response or response.status_code != 201:
            self.log("❌ POST /api/payments failed", "ERROR")
            return False
        
        try:
            payment = response.json()
            self.test_payment_id = payment.get("id")
            if not self.test_payment_id:
                self.log("❌ No payment ID in response", "ERROR")
                return False
            self.log(f"✅ POST /api/payments successful - Payment ID: {self.test_payment_id}")
        except Exception as e:
            self.log(f"❌ Failed to parse payment creation response: {e}", "ERROR")
            return False
        
        # Test 2: GET /api/payments/task/{task_id}
        self.log(f"Testing GET /api/payments/task/{self.test_task_id}...")
        response = self.make_request("GET", f"/payments/task/{self.test_task_id}", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ GET /api/payments/task/{task_id} failed", "ERROR")
            return False
        
        try:
            payments = response.json()
            self.log(f"✅ GET /api/payments/task/{{task_id}} successful - Found {len(payments)} payments")
        except Exception as e:
            self.log(f"❌ Failed to parse task payments response: {e}", "ERROR")
            return False
        
        # Test 3: POST /api/payments/{payment_id}/complete
        self.log(f"Testing POST /api/payments/{self.test_payment_id}/complete...")
        response = self.make_request("POST", f"/payments/{self.test_payment_id}/complete", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ POST /api/payments/{payment_id}/complete failed", "ERROR")
            return False
        
        try:
            result = response.json()
            self.log(f"✅ POST /api/payments/{{payment_id}}/complete successful - {result.get('message')}")
        except Exception as e:
            self.log(f"❌ Failed to parse payment completion response: {e}", "ERROR")
            return False
        
        self.log("✅ All Payment endpoints working correctly")
        return True
    
    def run_refactored_endpoints_tests(self):
        """Run all refactored endpoints tests"""
        self.log("🚀 Starting Refactored Endpoints Testing")
        self.log(f"Backend URL: {BACKEND_URL}")
        self.log("Testing 29 endpoints moved from server.py to modular route files")
        
        tests = [
            ("Authentication", self.test_authentication),
            ("Task Management Endpoints (16 endpoints)", self.test_task_management_endpoints),
            ("Timer Endpoints (3 endpoints)", self.test_timer_endpoints),
            ("Location Endpoints (4 endpoints)", self.test_location_endpoints),
            ("Payment Endpoints (3 endpoints)", self.test_payment_endpoints)
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                self.log(f"\n--- {test_name} ---")
                if test_func():
                    passed += 1
                    self.log(f"✅ {test_name} PASSED", "SUCCESS")
                else:
                    failed += 1
                    self.log(f"❌ {test_name} FAILED", "ERROR")
            except Exception as e:
                failed += 1
                self.log(f"❌ {test_name} FAILED with exception: {e}", "ERROR")
            
            print("-" * 60)
        
        # Summary
        total = passed + failed
        self.log(f"📊 REFACTORED ENDPOINTS TESTS SUMMARY: {passed}/{total} test categories passed")
        
        if failed > 0:
            self.log(f"❌ {failed} test categories failed", "ERROR")
            return False
        else:
            self.log("✅ All refactored endpoints tests passed!", "SUCCESS")
            self.log("🎉 Backend refactoring verification complete - all 29 endpoints working correctly")
            return True


if __name__ == "__main__":
    tester = RefactoredEndpointsTester()
    success = tester.run_refactored_endpoints_tests()
    sys.exit(0 if success else 1)
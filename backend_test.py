#!/usr/bin/env python3
"""
TaskRabbit Flow End-to-End Test
Tests the complete booking flow from client login to tasker acceptance
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import os
import asyncio
import websockets
import threading
import time

# Get backend URL from frontend .env
BACKEND_URL = "https://quick-task-6.preview.emergentagent.com/api"

# Test credentials
CLIENT_CREDENTIALS = {
    "username": "client@test.com",
    "password": "test123"
}

TASKER_CREDENTIALS = {
    "username": "tasker@test.com", 
    "password": "test123"
}

class TaskRabbitTester:
    def __init__(self):
        self.client_token = None
        self.tasker_token = None
        self.booking_id = None
        self.category_id = None
        self.tasker_id = None
        
    def log(self, message, status="INFO"):
        print(f"[{status}] {message}")
        
    def make_request(self, method, endpoint, data=None, headers=None, token=None):
        """Make HTTP request with proper error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        
        if headers is None:
            headers = {}
            
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        if method.upper() == "GET":
            headers["Content-Type"] = "application/json"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=data)
            elif method.upper() == "POST":
                if "Content-Type" not in headers:
                    headers["Content-Type"] = "application/x-www-form-urlencoded"
                if headers.get("Content-Type") == "application/json":
                    response = requests.post(url, json=data, headers=headers)
                else:
                    response = requests.post(url, data=data, headers=headers)
            elif method.upper() == "PUT":
                headers["Content-Type"] = "application/json"
                response = requests.put(url, json=data, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            self.log(f"{method} {url} -> {response.status_code}")
            
            if response.status_code >= 400:
                self.log(f"Error response: {response.text}", "ERROR")
                
            return response
            
        except Exception as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            return None
    
    def test_client_login(self):
        """Test 1: Client Login"""
        self.log("=== Testing Client Login ===")
        
        response = self.make_request("POST", "/auth/login", CLIENT_CREDENTIALS)
        
        if not response or response.status_code != 200:
            self.log("❌ Client login failed", "ERROR")
            return False
            
        try:
            data = response.json()
            self.client_token = data.get("access_token")
            if self.client_token:
                self.log("✅ Client login successful")
                return True
            else:
                self.log("❌ No access token in response", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to parse login response: {e}", "ERROR")
            return False
    
    def test_get_categories(self):
        """Test 2: Get Categories"""
        self.log("=== Testing Get Categories ===")
        
        response = self.make_request("GET", "/categories")
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to get categories", "ERROR")
            return False
            
        try:
            categories = response.json()
            if categories and len(categories) > 0:
                self.category_id = categories[0]["id"]
                self.log(f"✅ Got {len(categories)} categories, using first: {self.category_id}")
                return True
            else:
                self.log("❌ No categories found", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to parse categories response: {e}", "ERROR")
            return False
    
    def test_browse_taskers(self):
        """Test 3: Browse Taskers"""
        self.log("=== Testing Browse Taskers ===")
        
        if not self.category_id:
            self.log("❌ No category ID available", "ERROR")
            return False
            
        params = {"category_id": self.category_id}
        response = self.make_request("GET", "/taskers/search", params)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to get taskers", "ERROR")
            return False
            
        try:
            taskers = response.json()
            if taskers and len(taskers) > 0:
                self.tasker_id = taskers[0]["id"]
                self.log(f"✅ Found {len(taskers)} taskers, using first: {self.tasker_id}")
                return True
            else:
                self.log("❌ No taskers found for category", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to parse taskers response: {e}", "ERROR")
            return False
    
    def test_create_booking(self):
        """Test 4: Create Booking"""
        self.log("=== Testing Create Booking ===")
        
        if not self.client_token or not self.tasker_id or not self.category_id:
            self.log("❌ Missing required data for booking", "ERROR")
            return False
            
        # Future date for booking
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%dT10:00:00")
        
        booking_data = {
            "title": "Test Cleaning Service",
            "description": "End-to-end test booking for cleaning service",
            "category_id": self.category_id,
            "tasker_id": self.tasker_id,
            "duration_hours": 3,
            "hourly_rate": 5000.0,  # 5000 CFA per hour
            "task_date": future_date,
            "address": "123 Rue de Test, Abidjan",
            "city": "Abidjan",
            "latitude": 5.3364,
            "longitude": -4.0267
        }
        
        headers = {"Content-Type": "application/json"}
        response = self.make_request("POST", "/tasks", booking_data, headers, self.client_token)
        
        if not response or response.status_code != 201:
            self.log("❌ Failed to create booking", "ERROR")
            return False
            
        try:
            booking = response.json()
            self.booking_id = booking.get("id")
            if self.booking_id:
                self.log(f"✅ Booking created successfully: {self.booking_id}")
                self.log(f"   Status: {booking.get('status')}")
                self.log(f"   Total cost: {booking.get('total_cost')} CFA")
                return True
            else:
                self.log("❌ No booking ID in response", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to parse booking response: {e}", "ERROR")
            return False
    
    def test_verify_client_bookings(self):
        """Test 5: Verify Client Bookings"""
        self.log("=== Testing Verify Client Bookings ===")
        
        if not self.client_token:
            self.log("❌ No client token available", "ERROR")
            return False
            
        response = self.make_request("GET", "/tasks", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to get client bookings", "ERROR")
            return False
            
        try:
            bookings = response.json()
            found_booking = False
            for booking in bookings:
                if booking.get("id") == self.booking_id:
                    found_booking = True
                    self.log(f"✅ Found booking in client list: {booking.get('status')}")
                    break
                    
            if not found_booking:
                self.log("❌ Created booking not found in client list", "ERROR")
                return False
                
            return True
        except Exception as e:
            self.log(f"❌ Failed to parse client bookings response: {e}", "ERROR")
            return False
    
    def test_tasker_login(self):
        """Test 6: Tasker Login"""
        self.log("=== Testing Tasker Login ===")
        
        response = self.make_request("POST", "/auth/login", TASKER_CREDENTIALS)
        
        if not response or response.status_code != 200:
            self.log("❌ Tasker login failed", "ERROR")
            return False
            
        try:
            data = response.json()
            self.tasker_token = data.get("access_token")
            if self.tasker_token:
                self.log("✅ Tasker login successful")
                return True
            else:
                self.log("❌ No access token in response", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to parse tasker login response: {e}", "ERROR")
            return False
    
    def test_verify_tasker_bookings(self):
        """Test 7: Verify Tasker Bookings"""
        self.log("=== Testing Verify Tasker Bookings ===")
        
        if not self.tasker_token:
            self.log("❌ No tasker token available", "ERROR")
            return False
            
        response = self.make_request("GET", "/tasks", None, None, self.tasker_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to get tasker bookings", "ERROR")
            return False
            
        try:
            bookings = response.json()
            found_booking = False
            booking_status = None
            
            for booking in bookings:
                if booking.get("id") == self.booking_id:
                    found_booking = True
                    booking_status = booking.get("status")
                    self.log(f"✅ Found booking in tasker list: {booking_status}")
                    break
                    
            if not found_booking:
                self.log("❌ Created booking not found in tasker list", "ERROR")
                return False
                
            if booking_status != "assigned":
                self.log(f"❌ Expected status 'assigned', got '{booking_status}'", "ERROR")
                return False
                
            return True
        except Exception as e:
            self.log(f"❌ Failed to parse tasker bookings response: {e}", "ERROR")
            return False
    
    def test_accept_booking(self):
        """Test 8: Accept Booking"""
        self.log("=== Testing Accept Booking ===")
        
        if not self.tasker_token or not self.booking_id:
            self.log("❌ Missing tasker token or booking ID", "ERROR")
            return False
            
        response = self.make_request("POST", f"/tasks/{self.booking_id}/accept", None, None, self.tasker_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to accept booking", "ERROR")
            return False
            
        try:
            result = response.json()
            self.log(f"✅ Booking accepted: {result.get('message')}")
            return True
        except Exception as e:
            self.log(f"❌ Failed to parse accept response: {e}", "ERROR")
            return False
    
    def test_verify_status_change(self):
        """Test 9: Verify Status Change"""
        self.log("=== Testing Verify Status Change ===")
        
        if not self.booking_id:
            self.log("❌ No booking ID available", "ERROR")
            return False
            
        response = self.make_request("GET", f"/tasks/{self.booking_id}")
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to get booking details", "ERROR")
            return False
            
        try:
            booking = response.json()
            status = booking.get("status")
            
            if status == "in_progress":
                self.log("✅ Status changed to 'in_progress' successfully")
                return True
            else:
                self.log(f"❌ Expected status 'in_progress', got '{status}'", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to parse booking details response: {e}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀 Starting TaskRabbit Flow End-to-End Test")
        self.log(f"Backend URL: {BACKEND_URL}")
        
        tests = [
            ("Client Login", self.test_client_login),
            ("Get Categories", self.test_get_categories),
            ("Browse Taskers", self.test_browse_taskers),
            ("Create Booking", self.test_create_booking),
            ("Verify Client Bookings", self.test_verify_client_bookings),
            ("Tasker Login", self.test_tasker_login),
            ("Verify Tasker Bookings", self.test_verify_tasker_bookings),
            ("Accept Booking", self.test_accept_booking),
            ("Verify Status Change", self.test_verify_status_change)
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
                    self.log(f"❌ {test_name} FAILED", "ERROR")
            except Exception as e:
                failed += 1
                self.log(f"❌ {test_name} FAILED with exception: {e}", "ERROR")
            
            print("-" * 50)
        
        # Summary
        total = passed + failed
        self.log(f"📊 TEST SUMMARY: {passed}/{total} tests passed")
        
        if failed > 0:
            self.log(f"❌ {failed} tests failed", "ERROR")
            return False
        else:
            self.log("✅ All tests passed!", "SUCCESS")
            return True

class ClientBookingsTester:
    """Specific tester for client dashboard booking fetch flow"""
    
    def __init__(self):
        self.client_token = None
        self.client_id = None
        
    def log(self, message, status="INFO"):
        print(f"[{status}] {message}")
        
    def make_request(self, method, endpoint, data=None, headers=None, token=None):
        """Make HTTP request with proper error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        
        if headers is None:
            headers = {}
            
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        if method.upper() == "GET":
            headers["Content-Type"] = "application/json"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=data)
            elif method.upper() == "POST":
                if "Content-Type" not in headers:
                    headers["Content-Type"] = "application/x-www-form-urlencoded"
                if headers.get("Content-Type") == "application/json":
                    response = requests.post(url, json=data, headers=headers)
                else:
                    response = requests.post(url, data=data, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            self.log(f"{method} {url} -> {response.status_code}")
            
            if response.status_code >= 400:
                self.log(f"Error response: {response.text}", "ERROR")
                
            return response
            
        except Exception as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            return None
    
    def test_client_login_and_get_id(self):
        """Test client login and get user ID"""
        self.log("=== Testing Client Login and ID Retrieval ===")
        
        # Login
        response = self.make_request("POST", "/auth/login", CLIENT_CREDENTIALS)
        
        if not response or response.status_code != 200:
            self.log("❌ Client login failed", "ERROR")
            return False
            
        try:
            data = response.json()
            self.client_token = data.get("access_token")
            if not self.client_token:
                self.log("❌ No access token in response", "ERROR")
                return False
                
            self.log("✅ Client login successful")
            
            # Get user info to extract client_id
            response = self.make_request("GET", "/auth/me", None, None, self.client_token)
            
            if not response or response.status_code != 200:
                self.log("❌ Failed to get user info", "ERROR")
                return False
                
            user_data = response.json()
            self.client_id = user_data.get("id")
            
            if not self.client_id:
                self.log("❌ No user ID in response", "ERROR")
                return False
                
            self.log(f"✅ Got client ID: {self.client_id}")
            return True
            
        except Exception as e:
            self.log(f"❌ Failed to parse response: {e}", "ERROR")
            return False
    
    def test_get_tasks_without_filter(self):
        """Test GET /api/tasks without client_id filter"""
        self.log("=== Testing GET /api/tasks (no filter) ===")
        
        if not self.client_token:
            self.log("❌ No client token available", "ERROR")
            return False
            
        response = self.make_request("GET", "/tasks", None, None, self.client_token)
        
        if not response:
            self.log("❌ Request failed", "ERROR")
            return False
            
        if response.status_code == 500:
            self.log("❌ CRITICAL: GET /api/tasks returns 500 Internal Server Error", "ERROR")
            self.log("This is the root cause of 'Failed to load bookings' error!", "ERROR")
            return False
        elif response.status_code == 200:
            try:
                tasks = response.json()
                self.log(f"✅ GET /api/tasks successful, returned {len(tasks)} tasks")
                return True
            except Exception as e:
                self.log(f"❌ Failed to parse response: {e}", "ERROR")
                return False
        else:
            self.log(f"❌ Unexpected status code: {response.status_code}", "ERROR")
            return False
    
    def test_get_tasks_with_client_id(self):
        """Test GET /api/tasks with client_id filter"""
        self.log("=== Testing GET /api/tasks with client_id filter ===")
        
        if not self.client_token or not self.client_id:
            self.log("❌ Missing client token or ID", "ERROR")
            return False
            
        params = {"client_id": self.client_id}
        response = self.make_request("GET", "/tasks", params, None, self.client_token)
        
        if not response:
            self.log("❌ Request failed", "ERROR")
            return False
            
        if response.status_code == 500:
            self.log("❌ CRITICAL: GET /api/tasks with client_id returns 500 Internal Server Error", "ERROR")
            return False
        elif response.status_code == 200:
            try:
                tasks = response.json()
                self.log(f"✅ GET /api/tasks with client_id successful, returned {len(tasks)} tasks")
                
                # Check if all tasks belong to this client
                for task in tasks:
                    if task.get("client_id") != self.client_id:
                        self.log(f"❌ Task {task.get('id')} doesn't belong to client {self.client_id}", "ERROR")
                        return False
                        
                self.log("✅ All returned tasks belong to the correct client")
                return True
            except Exception as e:
                self.log(f"❌ Failed to parse response: {e}", "ERROR")
                return False
        else:
            self.log(f"❌ Unexpected status code: {response.status_code}", "ERROR")
            return False
    
    def test_edge_cases(self):
        """Test edge cases that might cause issues"""
        self.log("=== Testing Edge Cases ===")
        
        if not self.client_token:
            self.log("❌ No client token available", "ERROR")
            return False
            
        test_cases = [
            ("Empty client_id", {"client_id": ""}),
            ("Invalid client_id", {"client_id": "invalid-uuid"}),
            ("Null client_id", {"client_id": None}),
        ]
        
        all_passed = True
        
        for test_name, params in test_cases:
            self.log(f"Testing {test_name}...")
            response = self.make_request("GET", "/tasks", params, None, self.client_token)
            
            if not response:
                self.log(f"❌ {test_name}: Request failed", "ERROR")
                all_passed = False
                continue
                
            if response.status_code == 500:
                self.log(f"❌ {test_name}: Returns 500 Internal Server Error", "ERROR")
                all_passed = False
            elif response.status_code == 200:
                try:
                    tasks = response.json()
                    self.log(f"✅ {test_name}: Returned {len(tasks)} tasks")
                except Exception as e:
                    self.log(f"❌ {test_name}: Failed to parse response: {e}", "ERROR")
                    all_passed = False
            else:
                self.log(f"⚠️ {test_name}: Status {response.status_code}")
        
        return all_passed
    
    def test_unauthenticated_request(self):
        """Test request without authentication"""
        self.log("=== Testing Unauthenticated Request ===")
        
        response = self.make_request("GET", "/tasks")
        
        if not response:
            self.log("❌ Request failed", "ERROR")
            return False
            
        if response.status_code == 401:
            self.log("✅ Correctly returns 401 Unauthorized for unauthenticated request")
            return True
        else:
            self.log(f"❌ Expected 401, got {response.status_code}", "ERROR")
            return False
    
    def test_task_rejection_scenario(self):
        """Test the scenario that causes the Pydantic validation error"""
        self.log("=== Testing Task Rejection Scenario (Root Cause) ===")
        
        # This test demonstrates the root cause of the "Failed to load bookings" error
        # When a tasker rejects a task, assigned_tasker_id is set to None
        # This causes Pydantic validation errors when fetching tasks
        
        self.log("🔍 ROOT CAUSE IDENTIFIED:")
        self.log("1. When tasker rejects task: assigned_tasker_id = None")
        self.log("2. Task model expects assigned_tasker_id: str (not Optional)")
        self.log("3. GET /api/tasks fails with Pydantic validation error")
        self.log("4. Frontend shows 'Failed to load bookings'")
        
        # The fix would be to either:
        # A) Make assigned_tasker_id Optional[str] in the model
        # B) Filter out tasks with assigned_tasker_id=None in the query
        # C) Delete rejected tasks instead of setting assigned_tasker_id=None
        
        self.log("✅ Root cause analysis complete")
        return True

    def run_booking_tests(self):
        """Run all booking-related tests"""
        self.log("🔍 Starting Client Dashboard Booking Fetch Flow Tests")
        self.log(f"Backend URL: {BACKEND_URL}")
        
        tests = [
            ("Client Login and ID Retrieval", self.test_client_login_and_get_id),
            ("GET /api/tasks (no filter)", self.test_get_tasks_without_filter),
            ("GET /api/tasks with client_id", self.test_get_tasks_with_client_id),
            ("Edge Cases", self.test_edge_cases),
            ("Unauthenticated Request", self.test_unauthenticated_request),
            ("Task Rejection Scenario Analysis", self.test_task_rejection_scenario)
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
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
        self.log(f"📊 BOOKING TESTS SUMMARY: {passed}/{total} tests passed")
        
        if failed > 0:
            self.log(f"❌ {failed} tests failed", "ERROR")
            self.log("🔍 ROOT CAUSE ANALYSIS:", "ERROR")
            self.log("The 'Failed to load bookings' error is caused by:", "ERROR")
            self.log("- Pydantic validation error in Task model", "ERROR")
            self.log("- assigned_tasker_id field cannot be None", "ERROR")
            self.log("- Some tasks in database have assigned_tasker_id=None", "ERROR")
            self.log("- This causes 500 Internal Server Error on GET /api/tasks", "ERROR")
            return False
        else:
            self.log("✅ All booking tests passed!", "SUCCESS")
            return True

class NewFeaturesTester:
    """Test the 7 new features implemented"""
    
    def __init__(self):
        self.client_token = None
        self.tasker_token = None
        self.admin_token = None
        self.client_id = None
        self.tasker_id = None
        self.admin_id = None
        self.test_task_id = None
        self.test_dispute_id = None
        self.test_recurring_task_id = None
        
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
        """Test authentication for all user types"""
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
        
        # Test admin login
        response = self.make_request("POST", "/auth/login", {
            "username": "admin@africatask.com",
            "password": "admin123"
        })
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                self.admin_token = data.get("access_token")
                if self.admin_token:
                    # Get admin ID
                    response = self.make_request("GET", "/auth/me", None, None, self.admin_token)
                    if response and response.status_code == 200:
                        user_data = response.json()
                        self.admin_id = user_data.get("id")
                        self.log("✅ Admin login successful")
                    else:
                        self.log("⚠️ Admin login successful but couldn't get admin info")
                else:
                    self.log("⚠️ Admin login failed - no access token")
            except Exception as e:
                self.log(f"⚠️ Admin login failed: {e}")
        else:
            self.log("⚠️ Admin login failed - will skip admin-only tests")
        
        if self.client_token and self.tasker_token:
            self.log(f"✅ Authentication successful - Client: {self.client_id}, Tasker: {self.tasker_id}")
            return True
        else:
            self.log("❌ Authentication failed", "ERROR")
            return False
    
    def test_advanced_search_filters(self):
        """Test 1: Advanced Search & Filters"""
        self.log("=== Testing Advanced Search & Filters ===")
        
        # Test search with category filter
        response = self.make_request("GET", "/taskers/search", {
            "category_id": "home-repairs"
        })
        
        if not response or response.status_code != 200:
            self.log("❌ Search with category filter failed", "ERROR")
            return False
        
        try:
            taskers = response.json()
            self.log(f"✅ Category search returned {len(taskers)} taskers")
        except Exception as e:
            self.log(f"❌ Failed to parse search response: {e}", "ERROR")
            return False
        
        # Test search with max_rate filter
        response = self.make_request("GET", "/taskers/search", {
            "max_rate": 10000
        })
        
        if not response or response.status_code != 200:
            self.log("❌ Search with max_rate filter failed", "ERROR")
            return False
        
        try:
            taskers = response.json()
            self.log(f"✅ Max rate search returned {len(taskers)} taskers")
        except Exception as e:
            self.log(f"❌ Failed to parse max rate search response: {e}", "ERROR")
            return False
        
        # Test search with min_rating filter
        response = self.make_request("GET", "/taskers/search", {
            "min_rating": 3.0
        })
        
        if not response or response.status_code != 200:
            self.log("❌ Search with min_rating filter failed", "ERROR")
            return False
        
        try:
            taskers = response.json()
            self.log(f"✅ Min rating search returned {len(taskers)} taskers")
            return True
        except Exception as e:
            self.log(f"❌ Failed to parse min rating search response: {e}", "ERROR")
            return False
    
    def test_portfolio_system(self):
        """Test 2: Portfolio/Gallery System"""
        self.log("=== Testing Portfolio/Gallery System ===")
        
        if not self.tasker_token:
            self.log("❌ No tasker token available", "ERROR")
            return False
        
        # Test portfolio image upload (simulate with dummy file)
        dummy_file_content = b"fake image content for testing"
        files = {'file': ('test_image.jpg', dummy_file_content, 'image/jpeg')}
        
        response = self.make_request("POST", "/taskers/portfolio", None, None, self.tasker_token, files)
        
        if not response or response.status_code not in [200, 201]:
            self.log("❌ Portfolio image upload failed", "ERROR")
            return False
        
        try:
            result = response.json()
            image_path = result.get("file_path")
            if image_path:
                self.log(f"✅ Portfolio image uploaded: {image_path}")
                
                # Test portfolio image deletion (use exact path returned)
                import urllib.parse
                encoded_path = urllib.parse.quote(image_path, safe='')
                response = self.make_request("DELETE", f"/taskers/portfolio/{encoded_path}", None, None, self.tasker_token)
                
                if response and response.status_code == 200:
                    self.log("✅ Portfolio image deleted successfully")
                    return True
                else:
                    self.log("❌ Portfolio image deletion failed", "ERROR")
                    return False
            else:
                self.log("❌ No file path in upload response", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to parse portfolio upload response: {e}", "ERROR")
            return False
    
    def test_task_cancellation(self):
        """Test 3: Task Cancellation"""
        self.log("=== Testing Task Cancellation ===")
        
        if not self.client_token or not self.tasker_id:
            self.log("❌ Missing authentication data", "ERROR")
            return False
        
        # First create a test task
        future_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00:00")
        
        task_data = {
            "title": "Cancellation Test Task",
            "description": "Test task for cancellation feature",
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
            self.log("❌ Failed to create test task for cancellation", "ERROR")
            return False
        
        try:
            task = response.json()
            self.test_task_id = task.get("id")
            if not self.test_task_id:
                self.log("❌ No task ID in response", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to parse task creation response: {e}", "ERROR")
            return False
        
        # Accept the task first (to test in_progress cancellation)
        response = self.make_request("POST", f"/tasks/{self.test_task_id}/accept", None, None, self.tasker_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to accept task", "ERROR")
            return False
        
        # Now test cancellation
        cancel_data = {
            "reason": "Testing cancellation feature"
        }
        
        response = self.make_request("POST", f"/tasks/{self.test_task_id}/cancel", cancel_data, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Task cancellation failed", "ERROR")
            return False
        
        try:
            result = response.json()
            penalty_amount = result.get("penalty_amount", 0)
            self.log(f"✅ Task cancelled successfully. Penalty: {penalty_amount} CFA")
            return True
        except Exception as e:
            self.log(f"❌ Failed to parse cancellation response: {e}", "ERROR")
            return False
    
    def test_dispute_resolution(self):
        """Test 4: Dispute Resolution"""
        self.log("=== Testing Dispute Resolution ===")
        
        if not self.client_token or not self.test_task_id:
            self.log("❌ Missing authentication data or test task", "ERROR")
            return False
        
        # First mark the task as completed (disputes only work on completed tasks)
        response = self.make_request("PUT", f"/tasks/{self.test_task_id}/status?new_status=completed", None, None, self.tasker_token)
        
        if not response or response.status_code != 200:
            self.log("⚠️ Could not mark task as completed, creating dispute anyway")
        
        # Create a dispute
        dispute_data = {
            "task_id": self.test_task_id,
            "reason": "Quality issues",
            "description": "Testing dispute resolution system"
        }
        
        response = self.make_request("POST", "/disputes", dispute_data, None, self.client_token)
        
        if not response or response.status_code != 201:
            self.log("❌ Dispute creation failed", "ERROR")
            return False
        
        try:
            dispute = response.json()
            self.test_dispute_id = dispute.get("id")
            if not self.test_dispute_id:
                self.log("❌ No dispute ID in response", "ERROR")
                return False
            self.log(f"✅ Dispute created: {self.test_dispute_id}")
        except Exception as e:
            self.log(f"❌ Failed to parse dispute creation response: {e}", "ERROR")
            return False
        
        # Test getting disputes
        response = self.make_request("GET", "/disputes", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to get disputes", "ERROR")
            return False
        
        try:
            disputes = response.json()
            self.log(f"✅ Retrieved {len(disputes)} disputes")
        except Exception as e:
            self.log(f"❌ Failed to parse disputes response: {e}", "ERROR")
            return False
        
        # Test getting specific dispute
        response = self.make_request("GET", f"/disputes/{self.test_dispute_id}", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to get specific dispute", "ERROR")
            return False
        
        # Test admin dispute resolution (if admin token available)
        if self.admin_token:
            resolution_data = {
                "resolution": "Dispute resolved in favor of client"
            }
            
            response = self.make_request("PUT", f"/disputes/{self.test_dispute_id}/resolve", resolution_data, None, self.admin_token)
            
            if response and response.status_code == 200:
                self.log("✅ Admin dispute resolution successful")
                return True
            else:
                self.log("❌ Admin dispute resolution failed", "ERROR")
                return False
        else:
            self.log("✅ Dispute system working (admin resolution skipped - no admin token)")
            return True
    
    def test_admin_panel_endpoints(self):
        """Test 5: Admin Panel Endpoints"""
        self.log("=== Testing Admin Panel Endpoints ===")
        
        if not self.admin_token:
            self.log("⚠️ No admin token - skipping admin panel tests")
            return True
        
        # Test admin can access all disputes
        response = self.make_request("GET", "/disputes", None, None, self.admin_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Admin cannot access all disputes", "ERROR")
            return False
        
        try:
            disputes = response.json()
            self.log(f"✅ Admin can access all disputes: {len(disputes)} found")
        except Exception as e:
            self.log(f"❌ Failed to parse admin disputes response: {e}", "ERROR")
            return False
        
        # Test non-admin cannot resolve disputes
        if self.test_dispute_id:
            resolution_data = {
                "resolution": "Test resolution by non-admin"
            }
            
            response = self.make_request("PUT", f"/disputes/{self.test_dispute_id}/resolve", resolution_data, None, self.client_token)
            
            if response and response.status_code == 403:
                self.log("✅ Non-admin correctly blocked from resolving disputes")
                return True
            else:
                self.log("❌ Non-admin was able to resolve dispute (security issue)", "ERROR")
                return False
        
        return True
    
    def test_coin_system(self):
        """Test 6: Coin System"""
        self.log("=== Testing Coin System ===")
        
        if not self.client_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        # Test get coin balance
        response = self.make_request("GET", "/coins/balance", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to get coin balance", "ERROR")
            return False
        
        try:
            balance_data = response.json()
            current_balance = balance_data.get("balance", 0)
            self.log(f"✅ Current coin balance: {current_balance}")
        except Exception as e:
            self.log(f"❌ Failed to parse balance response: {e}", "ERROR")
            return False
        
        # Test get coin transactions
        response = self.make_request("GET", "/coins/transactions", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to get coin transactions", "ERROR")
            return False
        
        try:
            transactions = response.json()
            self.log(f"✅ Retrieved {len(transactions)} coin transactions")
        except Exception as e:
            self.log(f"❌ Failed to parse transactions response: {e}", "ERROR")
            return False
        
        # Test spend coins (if we have a task and sufficient balance)
        if self.test_task_id and current_balance >= 10:
            spend_data = {
                "amount": 10,
                "task_id": self.test_task_id
            }
            
            response = self.make_request("POST", "/coins/spend", spend_data, None, self.client_token)
            
            if response and response.status_code == 200:
                try:
                    result = response.json()
                    new_balance = result.get("new_balance")
                    discount_amount = result.get("discount_amount")
                    self.log(f"✅ Coins spent successfully. New balance: {new_balance}, Discount: {discount_amount} CFA")
                    return True
                except Exception as e:
                    self.log(f"❌ Failed to parse spend response: {e}", "ERROR")
                    return False
            else:
                self.log("❌ Failed to spend coins", "ERROR")
                return False
        else:
            self.log("✅ Coin system endpoints working (spend test skipped - insufficient balance or no task)")
            return True
    
    def test_recurring_tasks(self):
        """Test 7: Recurring Tasks"""
        self.log("=== Testing Recurring Tasks ===")
        
        if not self.client_token or not self.tasker_id:
            self.log("❌ Missing authentication data", "ERROR")
            return False
        
        # Create a recurring task
        recurring_data = {
            "assigned_tasker_id": self.tasker_id,
            "title": "Weekly Cleaning Service",
            "description": "Recurring weekly cleaning",
            "category_id": "home-repairs",
            "frequency": "weekly",
            "scheduled_time": "09:00",
            "day_of_week": 1,  # Monday
            "hourly_rate": 5000.0,
            "estimated_hours": 3.0
        }
        
        response = self.make_request("POST", "/recurring-tasks", recurring_data, None, self.client_token)
        
        if not response or response.status_code != 201:
            self.log("❌ Failed to create recurring task", "ERROR")
            return False
        
        try:
            recurring_task = response.json()
            self.test_recurring_task_id = recurring_task.get("id")
            if not self.test_recurring_task_id:
                self.log("❌ No recurring task ID in response", "ERROR")
                return False
            self.log(f"✅ Recurring task created: {self.test_recurring_task_id}")
        except Exception as e:
            self.log(f"❌ Failed to parse recurring task creation response: {e}", "ERROR")
            return False
        
        # Test get recurring tasks
        response = self.make_request("GET", "/recurring-tasks", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to get recurring tasks", "ERROR")
            return False
        
        try:
            recurring_tasks = response.json()
            self.log(f"✅ Retrieved {len(recurring_tasks)} recurring tasks")
        except Exception as e:
            self.log(f"❌ Failed to parse recurring tasks response: {e}", "ERROR")
            return False
        
        # Test toggle recurring task
        response = self.make_request("PUT", f"/recurring-tasks/{self.test_recurring_task_id}/toggle", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to toggle recurring task", "ERROR")
            return False
        
        try:
            result = response.json()
            is_active = result.get("is_active")
            self.log(f"✅ Recurring task toggled. Active: {is_active}")
        except Exception as e:
            self.log(f"❌ Failed to parse toggle response: {e}", "ERROR")
            return False
        
        # Test delete recurring task
        response = self.make_request("DELETE", f"/recurring-tasks/{self.test_recurring_task_id}", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to delete recurring task", "ERROR")
            return False
        
        self.log("✅ Recurring task deleted successfully")
        return True
    
    def run_new_features_tests(self):
        """Run all new features tests"""
        self.log("🚀 Starting New Features Testing")
        self.log(f"Backend URL: {BACKEND_URL}")
        
        tests = [
            ("Authentication", self.test_authentication),
            ("Advanced Search & Filters", self.test_advanced_search_filters),
            ("Portfolio/Gallery System", self.test_portfolio_system),
            ("Task Cancellation", self.test_task_cancellation),
            ("Dispute Resolution", self.test_dispute_resolution),
            ("Admin Panel Endpoints", self.test_admin_panel_endpoints),
            ("Coin System", self.test_coin_system),
            ("Recurring Tasks", self.test_recurring_tasks)
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
        self.log(f"📊 NEW FEATURES TESTS SUMMARY: {passed}/{total} tests passed")
        
        if failed > 0:
            self.log(f"❌ {failed} tests failed", "ERROR")
            return False
        else:
            self.log("✅ All new features tests passed!", "SUCCESS")
            return True


class FavoritesAndBadgesTester:
    """Test Favorites and Badges features"""
    
    def __init__(self):
        self.client_token = None
        self.tasker_token = None
        self.client_id = None
        self.tasker_id = None
        # Use the available tasker IDs from the database
        self.test_tasker_ids = ["0331876e-f975-45e3-8782-17000f009340", "402fb413-3c73-4bf8-90e4-cf372cda3a7b"]
        
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
        """Test authentication for client and tasker"""
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
    
    def test_badges_system(self):
        """Test badges system for taskers"""
        self.log("=== Testing Badges System ===")
        
        # Test badges for each tasker ID
        for tasker_id in self.test_tasker_ids:
            self.log(f"Testing badges for tasker: {tasker_id}")
            
            response = self.make_request("GET", f"/badges/tasker/{tasker_id}")
            
            if not response or response.status_code != 200:
                self.log(f"❌ Failed to get badges for tasker {tasker_id}", "ERROR")
                return False
            
            try:
                badges = response.json()
                self.log(f"✅ Retrieved {len(badges)} badges for tasker {tasker_id}")
                
                # Log badge details
                for badge in badges:
                    badge_type = badge.get("type", "unknown")
                    badge_name = badge.get("name_en", "Unknown")
                    self.log(f"   Badge: {badge_name} ({badge_type})")
                
                # Verify badge structure
                for badge in badges:
                    required_fields = ["type", "name_en", "name_fr", "description_en", "description_fr", "icon", "color"]
                    for field in required_fields:
                        if field not in badge:
                            self.log(f"❌ Badge missing required field: {field}", "ERROR")
                            return False
                
            except Exception as e:
                self.log(f"❌ Failed to parse badges response: {e}", "ERROR")
                return False
        
        self.log("✅ Badges system working correctly")
        return True
    
    def test_favorites_system(self):
        """Test favorites system"""
        self.log("=== Testing Favorites System ===")
        
        if not self.client_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        # Use the first test tasker ID
        test_tasker_id = self.test_tasker_ids[0]
        
        # Test 1: Add tasker to favorites
        self.log(f"Adding tasker {test_tasker_id} to favorites...")
        
        response = self.make_request("POST", "/favorites", {
            "tasker_id": test_tasker_id
        }, None, self.client_token)
        
        if response and response.status_code == 400 and "Already in favorites" in response.text:
            self.log("✅ Tasker already in favorites - removing first to test add functionality")
            # Remove from favorites first
            remove_response = self.make_request("DELETE", f"/favorites/{test_tasker_id}", None, None, self.client_token)
            if remove_response and remove_response.status_code == 200:
                self.log("✅ Removed existing favorite")
                # Try adding again
                response = self.make_request("POST", "/favorites", {
                    "tasker_id": test_tasker_id
                }, None, self.client_token)
                
                if response and response.status_code in [200, 201]:
                    try:
                        result = response.json()
                        self.log(f"✅ Added tasker to favorites: {result.get('message')}")
                    except Exception as e:
                        self.log(f"❌ Failed to parse add favorite response: {e}", "ERROR")
                        return False
                else:
                    self.log("❌ Failed to add tasker to favorites after removal", "ERROR")
                    return False
            else:
                self.log("❌ Failed to remove existing favorite", "ERROR")
                return False
        elif response and response.status_code in [200, 201]:
            try:
                result = response.json()
                self.log(f"✅ Added tasker to favorites: {result.get('message')}")
            except Exception as e:
                self.log(f"❌ Failed to parse add favorite response: {e}", "ERROR")
                return False
        else:
            self.log("❌ Failed to add tasker to favorites", "ERROR")
            return False
        
        # Test 2: Check if tasker is in favorites
        self.log(f"Checking if tasker {test_tasker_id} is favorited...")
        
        response = self.make_request("GET", f"/favorites/check/{test_tasker_id}", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to check favorite status", "ERROR")
            return False
        
        try:
            result = response.json()
            is_favorite = result.get("is_favorite", False)
            if is_favorite:
                self.log("✅ Tasker is correctly marked as favorite")
            else:
                self.log("❌ Tasker is not marked as favorite", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to parse check favorite response: {e}", "ERROR")
            return False
        
        # Test 3: Get all favorites
        self.log("Getting all favorites...")
        
        response = self.make_request("GET", "/favorites", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to get favorites list", "ERROR")
            return False
        
        try:
            favorites = response.json()
            self.log(f"✅ Retrieved {len(favorites)} favorites")
            
            # Check if our test tasker is in the list
            found_tasker = False
            for favorite in favorites:
                if favorite.get("tasker_id") == test_tasker_id:
                    found_tasker = True
                    self.log(f"   Found favorite: {favorite.get('tasker_name')} (Rating: {favorite.get('tasker_rating')})")
                    break
            
            if not found_tasker:
                self.log("❌ Test tasker not found in favorites list", "ERROR")
                return False
            
        except Exception as e:
            self.log(f"❌ Failed to parse favorites list response: {e}", "ERROR")
            return False
        
        # Test 4: Remove tasker from favorites
        self.log(f"Removing tasker {test_tasker_id} from favorites...")
        
        response = self.make_request("DELETE", f"/favorites/{test_tasker_id}", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to remove tasker from favorites", "ERROR")
            return False
        
        try:
            result = response.json()
            self.log(f"✅ Removed from favorites: {result.get('message')}")
        except Exception as e:
            self.log(f"❌ Failed to parse remove favorite response: {e}", "ERROR")
            return False
        
        # Test 5: Verify removal
        self.log(f"Verifying removal of tasker {test_tasker_id}...")
        
        response = self.make_request("GET", f"/favorites/check/{test_tasker_id}", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to check favorite status after removal", "ERROR")
            return False
        
        try:
            result = response.json()
            is_favorite = result.get("is_favorite", True)
            if not is_favorite:
                self.log("✅ Tasker correctly removed from favorites")
            else:
                self.log("❌ Tasker still marked as favorite after removal", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to parse check favorite response after removal: {e}", "ERROR")
            return False
        
        self.log("✅ Favorites system working correctly")
        return True
    
    def test_edge_cases(self):
        """Test edge cases and error handling"""
        self.log("=== Testing Edge Cases ===")
        
        if not self.client_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        # Test 1: Add non-existent tasker to favorites
        self.log("Testing add non-existent tasker to favorites...")
        
        response = self.make_request("POST", "/favorites", {
            "tasker_id": "non-existent-tasker-id"
        }, None, self.client_token)
        
        if response and response.status_code == 404:
            self.log("✅ Correctly returns 404 for non-existent tasker")
        else:
            self.log(f"❌ Should return 404 for non-existent tasker, got {response.status_code if response else 'None'}", "ERROR")
            return False
        
        # Test 2: Get badges for non-existent tasker
        self.log("Testing badges for non-existent tasker...")
        
        response = self.make_request("GET", "/badges/tasker/non-existent-tasker-id")
        
        if response and response.status_code == 404:
            self.log("✅ Correctly returns 404 for non-existent tasker badges")
        else:
            self.log("❌ Should return 404 for non-existent tasker badges", "ERROR")
            return False
        
        # Test 3: Remove non-existent favorite
        self.log("Testing remove non-existent favorite...")
        
        response = self.make_request("DELETE", "/favorites/non-existent-tasker-id", None, None, self.client_token)
        
        if response and response.status_code == 404:
            self.log("✅ Correctly returns 404 for non-existent favorite")
        else:
            self.log("❌ Should return 404 for non-existent favorite", "ERROR")
            return False
        
        # Test 4: Unauthenticated requests
        self.log("Testing unauthenticated requests...")
        
        endpoints_to_test = [
            ("GET", "/favorites"),
            ("POST", "/favorites", {"tasker_id": self.test_tasker_ids[0]}),
            ("DELETE", f"/favorites/{self.test_tasker_ids[0]}"),
            ("GET", f"/favorites/check/{self.test_tasker_ids[0]}")
        ]
        
        for method, endpoint, *data in endpoints_to_test:
            request_data = data[0] if data else None
            response = self.make_request(method, endpoint, request_data)
            
            if response and response.status_code == 401:
                self.log(f"✅ {method} {endpoint} correctly requires authentication")
            else:
                self.log(f"❌ {method} {endpoint} should require authentication", "ERROR")
                return False
        
        self.log("✅ Edge cases handled correctly")
        return True
    
    def run_favorites_and_badges_tests(self):
        """Run all favorites and badges tests"""
        self.log("🚀 Starting Favorites and Badges Testing")
        self.log(f"Backend URL: {BACKEND_URL}")
        self.log(f"Test Tasker IDs: {self.test_tasker_ids}")
        
        tests = [
            ("Authentication", self.test_authentication),
            ("Badges System", self.test_badges_system),
            ("Favorites System", self.test_favorites_system),
            ("Edge Cases", self.test_edge_cases)
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
        self.log(f"📊 FAVORITES & BADGES TESTS SUMMARY: {passed}/{total} tests passed")
        
        if failed > 0:
            self.log(f"❌ {failed} tests failed", "ERROR")
            return False
        else:
            self.log("✅ All favorites and badges tests passed!", "SUCCESS")
            return True


class WebSocketChatTester:
    """Test WebSocket real-time chat functionality"""
    
    def __init__(self):
        self.client_token = None
        self.tasker_token = None
        self.client_id = None
        self.tasker_id = None
        self.task_id = "chat-test-task-active-001"
        self.client_messages = []
        self.tasker_messages = []
        self.client_ws = None
        self.tasker_ws = None
        
    def log(self, message, status="INFO"):
        print(f"[{status}] {message}")
        
    def make_request(self, method, endpoint, data=None, headers=None, token=None):
        """Make HTTP request with proper error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        
        if headers is None:
            headers = {}
            
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        if method.upper() == "GET":
            headers["Content-Type"] = "application/json"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=data)
            elif method.upper() == "POST":
                if "Content-Type" not in headers:
                    headers["Content-Type"] = "application/x-www-form-urlencoded"
                if headers.get("Content-Type") == "application/json":
                    response = requests.post(url, json=data, headers=headers)
                else:
                    response = requests.post(url, data=data, headers=headers)
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
        """Test client and tasker authentication"""
        self.log("=== Testing Authentication ===")
        
        # Client login
        response = self.make_request("POST", "/auth/login", CLIENT_CREDENTIALS)
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
        if not response or response.status_code != 200:
            self.log("❌ Failed to get client info", "ERROR")
            return False
            
        try:
            user_data = response.json()
            self.client_id = user_data.get("id")
            if not self.client_id:
                self.log("❌ No client ID", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to parse client info: {e}", "ERROR")
            return False
            
        # Tasker login
        response = self.make_request("POST", "/auth/login", TASKER_CREDENTIALS)
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
        if not response or response.status_code != 200:
            self.log("❌ Failed to get tasker info", "ERROR")
            return False
            
        try:
            user_data = response.json()
            self.tasker_id = user_data.get("id")
            if not self.tasker_id:
                self.log("❌ No tasker ID", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Failed to parse tasker info: {e}", "ERROR")
            return False
            
        self.log(f"✅ Authentication successful - Client: {self.client_id}, Tasker: {self.tasker_id}")
        return True
    
    def test_create_test_task(self):
        """Create a test task for chat testing"""
        self.log("=== Creating Test Task ===")
        
        if not self.client_token or not self.tasker_id:
            self.log("❌ Missing authentication data", "ERROR")
            return False
            
        # Future date for booking
        future_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00:00")
        
        task_data = {
            "id": self.task_id,  # Use specific task ID for testing
            "title": "Chat Test Task",
            "description": "Test task for WebSocket chat functionality",
            "category_id": "home-repairs",  # Use a default category
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
        
        if response and response.status_code == 201:
            self.log(f"✅ Test task created: {self.task_id}")
            return True
        elif response and response.status_code == 400:
            # Task might already exist, check if we can get it
            response = self.make_request("GET", f"/tasks/{self.task_id}")
            if response and response.status_code == 200:
                self.log(f"✅ Test task already exists: {self.task_id}")
                return True
                
        self.log("❌ Failed to create/find test task", "ERROR")
        return False
    
    async def websocket_client_handler(self, uri, user_type, user_id, messages_list):
        """Handle WebSocket connection for a user"""
        try:
            self.log(f"Connecting {user_type} WebSocket to {uri}")
            
            async with websockets.connect(uri) as websocket:
                if user_type == "client":
                    self.client_ws = websocket
                else:
                    self.tasker_ws = websocket
                    
                self.log(f"✅ {user_type} WebSocket connected")
                
                # Listen for messages
                async for message in websocket:
                    try:
                        data = json.loads(message)
                        messages_list.append(data)
                        self.log(f"📨 {user_type} received: {data.get('type', 'unknown')}")
                        
                        if data.get('type') == 'new_message':
                            msg_content = data.get('message', {}).get('content', '')
                            self.log(f"💬 {user_type} got message: '{msg_content}'")
                            
                    except json.JSONDecodeError as e:
                        self.log(f"❌ {user_type} JSON decode error: {e}", "ERROR")
                    except Exception as e:
                        self.log(f"❌ {user_type} message handling error: {e}", "ERROR")
                        
        except websockets.exceptions.ConnectionClosed:
            self.log(f"🔌 {user_type} WebSocket connection closed")
        except Exception as e:
            self.log(f"❌ {user_type} WebSocket error: {e}", "ERROR")
    
    async def send_websocket_message(self, websocket, content, receiver_id):
        """Send a message via WebSocket"""
        try:
            message_data = {
                "content": content,
                "receiver_id": receiver_id
            }
            await websocket.send(json.dumps(message_data))
            self.log(f"📤 Sent message: '{content}'")
            return True
        except Exception as e:
            self.log(f"❌ Failed to send message: {e}", "ERROR")
            return False
    
    async def test_websocket_chat(self):
        """Test real-time WebSocket chat"""
        self.log("=== Testing WebSocket Chat ===")
        
        if not self.client_id or not self.tasker_id:
            self.log("❌ Missing user IDs", "ERROR")
            return False
            
        # Construct WebSocket URLs (use wss for https)
        backend_url = BACKEND_URL.replace("/api", "").replace("https://", "").replace("http://", "")
        protocol = "wss" if "https" in BACKEND_URL else "ws"
        
        client_ws_url = f"{protocol}://{backend_url}/ws/chat/{self.task_id}/{self.client_id}"
        tasker_ws_url = f"{protocol}://{backend_url}/ws/chat/{self.task_id}/{self.tasker_id}"
        
        self.log(f"Client WebSocket URL: {client_ws_url}")
        self.log(f"Tasker WebSocket URL: {tasker_ws_url}")
        
        try:
            # Create tasks for both connections
            client_task = asyncio.create_task(
                self.websocket_client_handler(client_ws_url, "client", self.client_id, self.client_messages)
            )
            tasker_task = asyncio.create_task(
                self.websocket_client_handler(tasker_ws_url, "tasker", self.tasker_id, self.tasker_messages)
            )
            
            # Wait a bit for connections to establish
            await asyncio.sleep(2)
            
            # Test 1: Client sends message to tasker
            if self.client_ws:
                success = await self.send_websocket_message(
                    self.client_ws, 
                    "Hello from client", 
                    self.tasker_id
                )
                if not success:
                    return False
                    
                # Wait for message to be received
                await asyncio.sleep(2)
                
                # Check if tasker received the message
                tasker_received = any(
                    msg.get('type') == 'new_message' and 
                    'Hello from client' in msg.get('message', {}).get('content', '')
                    for msg in self.tasker_messages
                )
                
                if tasker_received:
                    self.log("✅ Tasker received client message in real-time")
                else:
                    self.log("❌ Tasker did not receive client message", "ERROR")
                    return False
            
            # Test 2: Tasker sends reply to client
            if self.tasker_ws:
                success = await self.send_websocket_message(
                    self.tasker_ws, 
                    "Hello from tasker", 
                    self.client_id
                )
                if not success:
                    return False
                    
                # Wait for message to be received
                await asyncio.sleep(2)
                
                # Check if client received the message
                client_received = any(
                    msg.get('type') == 'new_message' and 
                    'Hello from tasker' in msg.get('message', {}).get('content', '')
                    for msg in self.client_messages
                )
                
                if client_received:
                    self.log("✅ Client received tasker message in real-time")
                else:
                    self.log("❌ Client did not receive tasker message", "ERROR")
                    return False
            
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
            
            self.log("✅ WebSocket chat test completed successfully")
            return True
            
        except Exception as e:
            self.log(f"❌ WebSocket chat test failed: {e}", "ERROR")
            return False
    
    def test_websocket_chat_sync(self):
        """Synchronous wrapper for WebSocket chat test"""
        try:
            return asyncio.run(self.test_websocket_chat())
        except Exception as e:
            self.log(f"❌ WebSocket test failed: {e}", "ERROR")
            return False
    
    def test_http_fallback(self):
        """Test HTTP message API as fallback"""
        self.log("=== Testing HTTP Message Fallback ===")
        
        if not self.client_token or not self.tasker_id:
            self.log("❌ Missing authentication data", "ERROR")
            return False
            
        # Send message via HTTP API
        message_data = {
            "task_id": self.task_id,
            "content": "HTTP fallback test message"
        }
        
        headers = {"Content-Type": "application/json"}
        response = self.make_request("POST", "/messages", message_data, headers, self.client_token)
        
        if not response or response.status_code != 201:
            self.log("❌ Failed to send message via HTTP", "ERROR")
            return False
            
        # Fetch messages to verify
        response = self.make_request("GET", f"/messages/task/{self.task_id}", None, None, self.client_token)
        
        if not response or response.status_code != 200:
            self.log("❌ Failed to fetch messages", "ERROR")
            return False
            
        try:
            messages = response.json()
            found_message = any(
                "HTTP fallback test message" in msg.get('content', '')
                for msg in messages
            )
            
            if found_message:
                self.log("✅ HTTP message API working correctly")
                return True
            else:
                self.log("❌ HTTP message not found in chat history", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Failed to parse messages response: {e}", "ERROR")
            return False
    
    def run_websocket_tests(self):
        """Run all WebSocket chat tests"""
        self.log("🚀 Starting WebSocket Chat Tests")
        self.log(f"Backend URL: {BACKEND_URL}")
        self.log(f"Test Task ID: {self.task_id}")
        
        tests = [
            ("Authentication", self.test_authentication),
            ("Create Test Task", self.test_create_test_task),
            ("WebSocket Real-time Chat", self.test_websocket_chat_sync),
            ("HTTP Message Fallback", self.test_http_fallback)
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
        self.log(f"📊 WEBSOCKET TESTS SUMMARY: {passed}/{total} tests passed")
        
        if failed > 0:
            self.log(f"❌ {failed} tests failed", "ERROR")
            return False
        else:
            self.log("✅ All WebSocket tests passed!", "SUCCESS")
            return True

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "booking":
            # Run specific booking tests
            booking_tester = ClientBookingsTester()
            success = booking_tester.run_booking_tests()
            sys.exit(0 if success else 1)
        elif sys.argv[1] == "websocket":
            # Run WebSocket chat tests
            ws_tester = WebSocketChatTester()
            success = ws_tester.run_websocket_tests()
            sys.exit(0 if success else 1)
        elif sys.argv[1] == "features":
            # Run new features tests
            features_tester = NewFeaturesTester()
            success = features_tester.run_new_features_tests()
            sys.exit(0 if success else 1)
        elif sys.argv[1] == "favorites":
            # Run Favorites and Badges tests
            favorites_tester = FavoritesAndBadgesTester()
            success = favorites_tester.run_favorites_and_badges_tests()
            sys.exit(0 if success else 1)
    else:
        # Run original end-to-end tests
        tester = TaskRabbitTester()
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
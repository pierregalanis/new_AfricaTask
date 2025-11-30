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

# Get backend URL from frontend .env
BACKEND_URL = "https://taskafy.preview.emergentagent.com/api"

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

if __name__ == "__main__":
    tester = TaskRabbitTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
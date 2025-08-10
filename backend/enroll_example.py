#!/usr/bin/env python3
"""
Practical Example: How to Enroll in Courses as a Student

This script demonstrates the complete enrollment workflow:
1. Login as a student
2. View available courses in the dashboard
3. Enroll in a course
4. Verify enrollment
5. Show how to unenroll if needed

Run this script to see exactly how the enrollment process works.
"""

import requests
import json
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:8000"
STUDENT_EMAIL = "cse22733151@matr.com"  # Your actual student email from dashboard
STUDENT_PASSWORD = "your_actual_password"  # Change this to your actual password

def print_separator(title: str):
    """Print a formatted separator with title"""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def print_response(response: requests.Response, title: str):
    """Print formatted response information"""
    print(f"\n--- {title} ---")
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)

def main():
    print("Student Course Enrollment Example")
    print("This script shows you exactly how to enroll in courses!")
    
    # Step 1: Login as Student
    print_separator("STEP 1: Login as Student")
    
    login_data = {
        "username": STUDENT_EMAIL,  # OAuth2PasswordRequestForm expects 'username'
        "password": STUDENT_PASSWORD
    }
    
    print(f"Logging in as: {STUDENT_EMAIL}")
    login_response = requests.post(f"{BASE_URL}/auth/login", data=login_data)  # Use 'data' instead of 'json'
    
    if login_response.status_code != 200:
        print("❌ Login failed!")
        print_response(login_response, "Login Error")
        return
    
    print("✅ Login successful!")
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 2: View Student Dashboard
    print_separator("STEP 2: View Available Courses in Dashboard")
    
    print("Getting student dashboard to see all available courses...")
    dashboard_response = requests.get(
        f"{BASE_URL}/courses/dashboard/student",
        headers=headers
    )
    
    if dashboard_response.status_code != 200:
        print("❌ Failed to get dashboard!")
        print_response(dashboard_response, "Dashboard Error")
        return
    
    courses = dashboard_response.json()
    print(f"✅ Found {len(courses)} courses in dashboard")
    
    # Display courses with enrollment status
    print("\n📚 Available Courses:")
    available_courses = []
    enrolled_courses = []
    
    for course in courses:
        course_info = f"- {course['name']} (ID: {course['id']})"
        if course['is_enrolled']:
            course_info += " ✅ ENROLLED"
            enrolled_courses.append(course)
        elif course['can_enroll']:
            course_info += f" 🔓 CAN ENROLL ({course['available_spots']} spots)"
            available_courses.append(course)
        else:
            course_info += f" ❌ CANNOT ENROLL ({course['available_spots']} spots)"
        
        print(course_info)
    
    # Step 3: Enroll in a Course (if available)
    if available_courses:
        print_separator("STEP 3: Enroll in a Course")
        
        # Choose the first available course
        course_to_enroll = available_courses[0]
        course_id = course_to_enroll["id"]
        course_name = course_to_enroll["name"]
        
        print(f"🎯 Enrolling in: {course_name} (ID: {course_id})")
        print(f"Available spots: {course_to_enroll['available_spots']}")
        
        enroll_response = requests.post(
            f"{BASE_URL}/courses/{course_id}/self-enroll",
            headers=headers
        )
        
        if enroll_response.status_code == 200:
            print("✅ Successfully enrolled!")
            print_response(enroll_response, "Enrollment Success")
        else:
            print("❌ Enrollment failed!")
            print_response(enroll_response, "Enrollment Error")
    else:
        print("\n⚠️  No courses available for enrollment at the moment.")
        print("This could mean:")
        print("- All courses are full")
        print("- All courses are inactive")
        print("- You're already enrolled in all available courses")
    
    # Step 4: Verify Enrollment
    print_separator("STEP 4: Verify Enrollment")
    
    print("Refreshing dashboard to verify enrollment status...")
    verify_response = requests.get(
        f"{BASE_URL}/courses/dashboard/student",
        headers=headers
    )
    
    if verify_response.status_code == 200:
        updated_courses = verify_response.json()
        print("✅ Dashboard refreshed successfully!")
        
        # Find the course we just enrolled in
        for course in updated_courses:
            if course['id'] == course_id:
                if course['is_enrolled']:
                    print(f"🎉 Confirmed: {course['name']} is now marked as ENROLLED!")
                    print(f"   Enrolled count: {course['enrolled_count']}")
                    print(f"   Available spots: {course['available_spots']}")
                else:
                    print(f"❌ {course['name']} is still not marked as enrolled")
                break
    else:
        print("❌ Failed to verify enrollment!")
        print_response(verify_response, "Verification Error")
    
    # Step 5: Show Unenrollment Option
    if 'course_id' in locals() and available_courses:
        print_separator("STEP 5: How to Unenroll (Optional)")
        
        print(f"To unenroll from {course_name}, you would use:")
        print(f"DELETE {BASE_URL}/courses/{course_id}/self-unenroll")
        
        print("\nExample with curl:")
        print(f'curl -X DELETE "{BASE_URL}/courses/{course_id}/self-unenroll" \\')
        print(f'  -H "Authorization: Bearer YOUR_TOKEN"')
        
        print("\nExample with Python:")
        print(f'requests.delete("{BASE_URL}/courses/{course_id}/self-unenroll", headers=headers)')
    
    # Final Summary
    print_separator("ENROLLMENT PROCESS COMPLETE!")
    
    print("🎓 You now know how to:")
    print("1. View all available courses in your dashboard")
    print("2. Identify courses you can enroll in")
    print("3. Self-enroll using the enrollment endpoint")
    print("4. Verify your enrollment status")
    print("5. Unenroll if needed")
    
    print("\n💡 Key Endpoints:")
    print(f"   Dashboard: GET {BASE_URL}/courses/dashboard/student")
    print(f"   Enroll: POST {BASE_URL}/courses/{{course_id}}/self-enroll")
    print(f"   Unenroll: DELETE {BASE_URL}/courses/{{course_id}}/self-unenroll")
    
    print("\n🚀 You're ready to enroll in courses!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Script interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        print("Make sure your FastAPI server is running on localhost:8000")

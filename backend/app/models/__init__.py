# backend/app/models/__init__.py

from .user import User, UserRole
from .course import Course, course_students
from .attendance import Attendance, AttendanceStatus

__all__ = [
    "User", 
    "UserRole", 
    "Course", 
    "course_students", 
    "Attendance", 
    "AttendanceStatus"
]

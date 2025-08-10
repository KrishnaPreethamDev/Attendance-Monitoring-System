# backend/app/schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Enums
class UserRole(str, Enum):
    student = "student"
    instructor = "instructor"
    admin = "admin"

class AttendanceStatus(str, Enum):
    present = "present"
    absent = "absent"
    late = "late"

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole
    department: str
    program: Optional[str] = None
    student_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    program: Optional[str] = None
    student_id: Optional[str] = None
    avatar: Optional[str] = None

class UserResponse(UserBase):
    id: int
    avatar: Optional[str] = None
    is_active: bool
    last_login: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Authentication Schemas
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Attendance Schemas
class AttendanceBase(BaseModel):
    course_id: str
    course_name: str
    course_code: str
    instructor_id: int
    session_start: datetime
    session_end: datetime
    status: AttendanceStatus
    confidence: Optional[float] = 0.0
    face_data: Optional[str] = None
    location: Optional[str] = None
    device_info: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    user_id: int

class AttendanceResponse(AttendanceBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Course Schemas
class CourseBase(BaseModel):
    name: str
    code: str
    instructor_id: int
    department: str
    description: Optional[str] = ""
    schedule: Optional[str] = ""
    room: Optional[str] = ""
    max_students: int = 50
    semester: str
    academic_year: str

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    schedule: Optional[str] = None
    room: Optional[str] = None
    max_students: Optional[int] = None
    is_active: Optional[bool] = None
    semester: Optional[str] = None
    academic_year: Optional[str] = None

class CourseResponse(CourseBase):
    id: int
    is_active: bool
    enrolled_students: List[UserResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Face Recognition Schemas
class FaceCompareResult(BaseModel):
    match: bool
    confidence: Optional[float] = None
    user: Optional[UserResponse] = None

class FaceEmbeddingResponse(BaseModel):
    embedding: List[float]

class FaceRegisterRequest(BaseModel):
    face_data: str  # Base64 encoded image

class FaceVerifyRequest(BaseModel):
    face_data: str  # Base64 encoded image

# Bulk Operations
class BulkAttendanceCreate(BaseModel):
    attendances: List[AttendanceCreate]

# Statistics
class AttendanceStats(BaseModel):
    total_sessions: int
    present_count: int
    absent_count: int
    late_count: int
    attendance_rate: float

# Notification Schemas
class NotificationBase(BaseModel):
    title: str
    message: str
    notification_type: str
    priority: str = "medium"
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None

class NotificationCreate(NotificationBase):
    user_id: int

class NotificationUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    notification_type: Optional[str] = None
    priority: Optional[str] = None
    is_read: Optional[bool] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total_count: int
    unread_count: int

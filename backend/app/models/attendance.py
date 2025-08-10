# backend/app/models/attendance.py

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(String, nullable=False)
    course_name = Column(String, nullable=False)
    course_code = Column(String, nullable=False)
    instructor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_start = Column(DateTime, nullable=False)
    session_end = Column(DateTime, nullable=False)
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.present)
    confidence = Column(Float, default=0.0)
    face_data = Column(String, nullable=True)  # Base64 encoded face data for verification
    location = Column(String, nullable=True)
    device_info = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    instructor = relationship("User", foreign_keys=[instructor_id])

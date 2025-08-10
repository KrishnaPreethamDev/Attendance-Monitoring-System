# backend/app/models/user.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    student = "student"
    instructor = "instructor"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.student)
    student_id = Column(String, unique=True, nullable=True)
    department = Column(String, nullable=False)
    program = Column(String, nullable=True)
    face_data = Column(String, nullable=True)  # Base64 encoded face data
    avatar = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

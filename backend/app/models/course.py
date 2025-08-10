# backend/app/models/course.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

# Association table for many-to-many relationship between courses and students
course_students = Table(
    'course_students',
    Base.metadata,
    Column('course_id', Integer, ForeignKey('courses.id'), primary_key=True),
    Column('student_id', Integer, ForeignKey('users.id'), primary_key=True)
)

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    instructor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department = Column(String, nullable=False)
    description = Column(String, default="")
    schedule = Column(String, default="")
    room = Column(String, default="")
    max_students = Column(Integer, default=50)
    is_active = Column(Boolean, default=True)
    semester = Column(String, nullable=False)
    academic_year = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    instructor = relationship("User", foreign_keys=[instructor_id])
    enrolled_students = relationship("User", secondary=course_students, backref="enrolled_courses")

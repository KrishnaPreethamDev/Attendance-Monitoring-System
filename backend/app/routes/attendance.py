from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.deps import get_db
from app.models.user import User
from app.models.attendance import Attendance
from app.schemas import (
    AttendanceCreate, AttendanceResponse, BulkAttendanceCreate, AttendanceStats
)
from app.auth.routes import get_current_user
from app.services.notification_service import NotificationService

router = APIRouter()

@router.post("/", response_model=AttendanceResponse)
def mark_attendance(
    attendance_data: AttendanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only instructors can mark attendance
    if current_user.role.value != "instructor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can mark attendance"
        )
    
    # Verify instructor exists
    instructor = db.query(User).filter(User.id == attendance_data.instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    # Get student information for notification
    student = db.query(User).filter(User.id == attendance_data.user_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Create attendance record
    db_attendance = Attendance(
        user_id=attendance_data.user_id if hasattr(attendance_data, 'user_id') else current_user.id,
        course_id=attendance_data.course_id,
        course_name=attendance_data.course_name,
        course_code=attendance_data.course_code,
        instructor_id=attendance_data.instructor_id,
        session_start=attendance_data.session_start,
        session_end=attendance_data.session_end,
        status=attendance_data.status,
        confidence=attendance_data.confidence,
        face_data=attendance_data.face_data,
        location=attendance_data.location,
        device_info=attendance_data.device_info
    )
    
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    
    # Create notifications for attendance marking
    try:
        NotificationService.notify_attendance_marked(
            db=db,
            student_id=attendance_data.user_id,
            instructor_id=attendance_data.instructor_id,
            course_name=attendance_data.course_name,
            course_code=attendance_data.course_code,
            status=attendance_data.status.value
        )
    except Exception as e:
        # Log error but don't fail the attendance marking
        print(f"Failed to create notification: {e}")
    
    return db_attendance

@router.get("/user/{user_id}", response_model=List[AttendanceResponse])
def get_user_attendance(
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Users can only view their own attendance, or instructors can view any
    if current_user.id != user_id and current_user.role.value != "instructor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    attendances = db.query(Attendance).filter(
        Attendance.user_id == user_id
    ).offset(skip).limit(limit).all()
    
    return attendances

@router.get("/course/{course_id}", response_model=List[AttendanceResponse])
def get_course_attendance(
    course_id: str,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only instructors can view course attendance
    if current_user.role.value != "instructor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    attendances = db.query(Attendance).filter(
        Attendance.course_id == course_id
    ).offset(skip).limit(limit).all()
    
    return attendances

@router.get("/stats/{user_id}", response_model=AttendanceStats)
def get_attendance_stats(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Users can only view their own stats, or instructors can view any
    if current_user.id != user_id and current_user.role.value != "instructor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    attendances = db.query(Attendance).filter(Attendance.user_id == user_id).all()
    
    total_sessions = len(attendances)
    present_count = len([a for a in attendances if a.status.value == "present"])
    absent_count = len([a for a in attendances if a.status.value == "absent"])
    late_count = len([a for a in attendances if a.status.value == "late"])
    
    attendance_rate = (present_count / total_sessions * 100) if total_sessions > 0 else 0
    
    return AttendanceStats(
        total_sessions=total_sessions,
        present_count=present_count,
        absent_count=absent_count,
        late_count=late_count,
        attendance_rate=attendance_rate
    )

@router.post("/bulk", response_model=List[AttendanceResponse])
def mark_bulk_attendance(
    bulk_data: BulkAttendanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only instructors can mark bulk attendance
    if current_user.role.value != "instructor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors can mark bulk attendance"
        )
    
    attendances = []
    for attendance_data in bulk_data.attendances:
        # Verify user exists
        user = db.query(User).filter(User.id == attendance_data.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {attendance_data.user_id} not found"
            )
        
        # Verify instructor exists
        instructor = db.query(User).filter(User.id == attendance_data.instructor_id).first()
        if not instructor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Instructor with ID {attendance_data.instructor_id} not found"
            )
        
        db_attendance = Attendance(
            user_id=attendance_data.user_id,
            course_id=attendance_data.course_id,
            course_name=attendance_data.course_name,
            course_code=attendance_data.course_code,
            instructor_id=attendance_data.instructor_id,
            session_start=attendance_data.session_start,
            session_end=attendance_data.session_end,
            status=attendance_data.status,
            confidence=attendance_data.confidence,
            face_data=attendance_data.face_data,
            location=attendance_data.location,
            device_info=attendance_data.device_info
        )
        
        db.add(db_attendance)
        attendances.append(db_attendance)
    
    db.commit()
    
    # Refresh all attendance records
    for attendance in attendances:
        db.refresh(attendance)
    
    # Create notifications for bulk attendance marking
    try:
        for attendance_data in bulk_data.attendances:
            NotificationService.notify_attendance_marked(
                db=db,
                student_id=attendance_data.user_id,
                instructor_id=attendance_data.instructor_id,
                course_name=attendance_data.course_name,
                course_code=attendance_data.course_code,
                status=attendance_data.status.value
            )
    except Exception as e:
        # Log error but don't fail the attendance marking
        print(f"Failed to create bulk notifications: {e}")
    
    return attendances

@router.get("/instructor/{instructor_id}", response_model=List[AttendanceResponse])
def get_instructor_attendance(
    instructor_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only the instructor themselves can view instructor attendance
    if current_user.id != instructor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    attendances = db.query(Attendance).filter(
        Attendance.instructor_id == instructor_id
    ).offset(skip).limit(limit).all()
    
    return attendances

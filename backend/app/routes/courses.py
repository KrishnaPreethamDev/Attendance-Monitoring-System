from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.deps import get_db
from app.models.user import User, UserRole
from app.models.course import Course
from app.schemas import (
    CourseCreate, CourseResponse, CourseUpdate
)
from app.auth.routes import get_current_user
from app.services.notification_service import NotificationService

router = APIRouter()

@router.get("/", response_model=List[CourseResponse])
def get_courses(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    courses = db.query(Course).offset(skip).limit(limit).all()
    return courses

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    return course

@router.post("/", response_model=CourseResponse)
def create_course(
    course_data: CourseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only instructors and admins can create courses
    if current_user.role.value not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Check if course code already exists
    existing_course = db.query(Course).filter(Course.code == course_data.code).first()
    if existing_course:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course code already exists"
        )
    
    # Verify instructor exists
    instructor = db.query(User).filter(User.id == course_data.instructor_id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    # Only admins can assign courses to other instructors
    if current_user.role.value != "admin" and current_user.id != course_data.instructor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only create courses for yourself"
        )
    
    db_course = Course(**course_data.dict())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    
    # Send notification to instructor
    NotificationService.notify_course_created(
        db=db,
        course_name=db_course.name,
        course_code=db_course.code,
        instructor_id=db_course.instructor_id
    )
    
    return db_course

@router.put("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    course_update: CourseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Only the course instructor or admin can update the course
    if current_user.id != course.instructor_id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Check if course code is being changed and if it's already taken
    if course_update.code and course_update.code != course.code:
        existing_course = db.query(Course).filter(Course.code == course_update.code).first()
        if existing_course:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Course code already exists"
            )
    
    # Update course fields
    update_data = course_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(course, field, value)
    
    course.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(course)
    
    # Send notification to instructor
    NotificationService.notify_course_updated(
        db=db,
        course_name=course.name,
        course_code=course.code,
        instructor_id=course.instructor_id
    )
    
    return course

@router.post("/{course_id}/enroll/{student_id}")
def enroll_student(
    course_id: int,
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Only the course instructor or admin can enroll students
    if current_user.id != course.instructor_id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Check if student is already enrolled
    if student in course.enrolled_students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is already enrolled"
        )
    
    # Check if course is full
    if len(course.enrolled_students) >= course.max_students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course is full"
        )
    
    course.enrolled_students.append(student)
    db.commit()
    return {"message": "Student enrolled successfully"}

@router.delete("/{course_id}/enroll/{student_id}")
def remove_student(
    course_id: int,
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Only the course instructor or admin can remove students
    if current_user.id != course.instructor_id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Check if student is enrolled
    if student not in course.enrolled_students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is not enrolled"
        )
    
    course.enrolled_students.remove(student)
    db.commit()
    return {"message": "Student removed successfully"}

@router.get("/instructor/{instructor_id}", response_model=List[CourseResponse])
def get_instructor_courses(
    instructor_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only the instructor themselves or admins can view instructor courses
    if current_user.id != instructor_id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    courses = db.query(Course).filter(
        Course.instructor_id == instructor_id
    ).offset(skip).limit(limit).all()
    
    return courses

@router.get("/student/{student_id}", response_model=List[CourseResponse])
def get_student_courses(
    student_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Users can only view their own courses, or instructors/admins can view any
    if current_user.id != student_id and current_user.role.value not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    return student.enrolled_courses

@router.delete("/{course_id}")
def delete_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a course - only admins can delete courses"""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete courses"
        )
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Get enrolled students before deleting
    enrolled_student_ids = [student.id for student in course.enrolled_students]
    
    # Send notifications before deleting
    if enrolled_student_ids:
        NotificationService.notify_course_deleted(
            db=db,
            course_name=course.name,
            course_code=course.code,
            instructor_id=course.instructor_id,
            enrolled_students=enrolled_student_ids
        )
    
    # Delete the course (enrollments will be cascaded)
    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully"}

@router.get("/available", response_model=List[CourseResponse])
def get_available_courses(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available courses for enrollment - shows courses that are active and not full"""
    # Get all active courses
    available_courses = db.query(Course).filter(
        Course.is_active == True
    ).offset(skip).limit(limit).all()
    
    # Filter out courses where the student is already enrolled
    if current_user.role == UserRole.student:
        available_courses = [
            course for course in available_courses 
            if current_user not in course.enrolled_students
        ]
    
    return available_courses

@router.post("/{course_id}/self-enroll")
def self_enroll_student(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allow students to enroll themselves in a course"""
    # Only students can self-enroll
    if current_user.role != UserRole.student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can self-enroll in courses"
        )
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check if course is active
    if not course.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course is not active for enrollment"
        )
    
    # Check if student is already enrolled
    if current_user in course.enrolled_students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already enrolled in this course"
        )
    
    # Check if course is full
    if len(course.enrolled_students) >= course.max_students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course is full and cannot accept more students"
        )
    
    # Enroll the student
    course.enrolled_students.append(current_user)
    db.commit()
    
    # Send notifications
    NotificationService.notify_course_enrollment(
        db=db,
        student_id=current_user.id,
        instructor_id=course.instructor_id,
        course_name=course.name,
        course_code=course.code
    )
    
    return {
        "message": "Successfully enrolled in course",
        "course_id": course_id,
        "course_name": course.name,
        "course_code": course.code,
        "enrollment_date": datetime.utcnow()
    }

@router.delete("/{course_id}/self-unenroll")
def self_unenroll_student(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allow students to unenroll themselves from a course"""
    # Only students can self-unenroll
    if current_user.role != UserRole.student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can self-unenroll from courses"
        )
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check if student is enrolled
    if current_user not in course.enrolled_students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not enrolled in this course"
        )
    
    # Unenroll the student
    course.enrolled_students.remove(current_user)
    db.commit()
    
    return {
        "message": "Successfully unenrolled from course",
        "course_id": course_id,
        "course_name": course.name,
        "course_code": course.code,
        "unenrollment_date": datetime.utcnow()
    }

@router.get("/dashboard/student", response_model=List[dict])
def get_student_dashboard_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all courses for student dashboard - shows both enrolled and available courses"""
    if current_user.role != UserRole.student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access student dashboard"
        )
    
    # Get all active courses
    all_active_courses = db.query(Course).filter(Course.is_active == True).all()
    
    dashboard_courses = []
    
    for course in all_active_courses:
        is_enrolled = current_user in course.enrolled_students
        available_spots = course.max_students - len(course.enrolled_students)
        
        course_info = {
            "id": course.id,
            "name": course.name,
            "code": course.code,
            "description": course.description,
            "instructor_name": course.instructor.name,
            "instructor_id": course.instructor_id,
            "is_active": course.is_active,
            "max_students": course.max_students,
            "enrolled_count": len(course.enrolled_students),
            "available_spots": available_spots,
            "is_enrolled": is_enrolled,
            "can_enroll": not is_enrolled and available_spots > 0 and course.is_active,
            "created_at": course.created_at,
            "updated_at": course.updated_at
        }
        
        dashboard_courses.append(course_info)
    
    # Sort: enrolled courses first, then available courses
    dashboard_courses.sort(key=lambda x: (not x["is_enrolled"], x["name"]))
    
    return dashboard_courses

@router.get("/dashboard/student/simple", response_model=List[dict])
def get_student_dashboard_simple(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get simplified course list for student dashboard - shows course names and enrollment status"""
    if current_user.role != UserRole.student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access student dashboard"
        )
    
    # Get all active courses
    all_active_courses = db.query(Course).filter(Course.is_active == True).all()
    
    dashboard_courses = []
    
    for course in all_active_courses:
        is_enrolled = current_user in course.enrolled_students
        available_spots = course.max_students - len(course.enrolled_students)
        
        course_info = {
            "id": course.id,
            "name": course.name,
            "code": course.code,
            "instructor_name": course.instructor.name,
            "is_enrolled": is_enrolled,
            "can_enroll": not is_enrolled and available_spots > 0,
            "available_spots": available_spots
        }
        
        dashboard_courses.append(course_info)
    
    # Sort: enrolled courses first, then available courses
    dashboard_courses.sort(key=lambda x: (not x["is_enrolled"], x["name"]))
    
    return dashboard_courses

@router.get("/instructor/{instructor_id}/enrolled-students", response_model=List[dict])
def get_instructor_enrolled_students(
    instructor_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all enrolled students for all courses of an instructor"""
    # Only the instructor themselves or admins can view enrolled students
    if current_user.id != instructor_id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Get all courses for the instructor
    courses = db.query(Course).filter(
        Course.instructor_id == instructor_id
    ).all()
    
    # Collect all unique enrolled students
    enrolled_students = {}
    for course in courses:
        for student in course.enrolled_students:
            if student.id not in enrolled_students:
                enrolled_students[student.id] = {
                    "id": student.id,
                    "name": student.name,
                    "email": student.email,
                    "department": student.department,
                    "program": student.program,
                    "student_id": student.student_id,
                    "face_data": student.face_data,
                    "avatar": student.avatar,
                    "is_active": student.is_active,
                    "last_login": student.last_login,
                    "created_at": student.created_at,
                    "updated_at": student.updated_at,
                    "enrolled_courses": []
                }
            
            # Add course information to student's enrolled courses
            enrolled_students[student.id]["enrolled_courses"].append({
                "course_id": course.id,
                "course_name": course.name,
                "course_code": course.code,
                "semester": course.semester,
                "academic_year": course.academic_year
            })
    
    # Convert to list and apply pagination
    students_list = list(enrolled_students.values())
    students_list = students_list[skip:skip + limit]
    
    return students_list

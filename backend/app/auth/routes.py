# backend/app/auth/routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.deps import get_db
from app.models.user import User
from app.schemas import (
    UserCreate, UserResponse, UserLogin, Token, UserUpdate
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
SECRET_KEY = "your-secret-key-here"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if student_id is unique (if provided)
    if user_data.student_id:
        existing_student = db.query(User).filter(User.student_id == user_data.student_id).first()
        if existing_student:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student ID already exists"
            )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        student_id=user_data.student_id,
        department=user_data.department,
        program=user_data.program
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if email is being changed and if it's already taken
    if user_update.email and user_update.email != current_user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Check if student_id is being changed and if it's already taken
    if user_update.student_id and user_update.student_id != current_user.student_id:
        existing_student = db.query(User).filter(User.student_id == user_update.student_id).first()
        if existing_student:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student ID already exists"
            )
    
    # Update user fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/users", response_model=List[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only admin can list all users
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/users/{user_id}/delete-impact")
def get_delete_impact(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get information about what would be affected if this user is deleted.
    
    This endpoint helps admins understand the impact before deleting a user.
    Returns information about courses, attendance records, and enrollments.
    """
    # Only admin can check delete impact
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Find the user to check
    user_to_check = db.query(User).filter(User.id == user_id).first()
    if not user_to_check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    from app.models.course import Course
    from app.models.attendance import Attendance
    
    # Check courses where user is instructor
    courses_as_instructor = db.query(Course).filter(Course.instructor_id == user_id).all()
    
    # Check attendance records where user is involved
    attendance_records = db.query(Attendance).filter(
        (Attendance.user_id == user_id) | (Attendance.instructor_id == user_id)
    ).all()
    
    # Check course enrollments
    from sqlalchemy import text
    enrolled_courses = db.execute(
        text("SELECT course_id FROM course_students WHERE student_id = :user_id"), 
        {"user_id": user_id}
    ).fetchall()
    
    return {
        "user_id": user_id,
        "user_name": user_to_check.name,
        "user_email": user_to_check.email,
        "user_role": user_to_check.role.value,
        "impact": {
            "courses_as_instructor": [
                {"id": course.id, "name": course.name, "code": course.code} 
                for course in courses_as_instructor
            ],
            "attendance_records": len(attendance_records),
            "enrolled_courses": len(enrolled_courses),
            "can_delete_safely": len(courses_as_instructor) == 0
        }
    }

@router.get("/users/available-instructors")
def get_available_instructors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of available instructors for course reassignment.
    
    This endpoint returns all users who can be assigned as course instructors
    (users with role 'instructor' or 'admin'). Useful when reassigning courses
    before deleting a user.
    """
    # Only admin can get available instructors
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Get all users who are instructors or admins
    instructors = db.query(User).filter(
        (User.role == "instructor") | (User.role == "admin")
    ).all()
    
    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "department": user.department
        }
        for user in instructors
    ]

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    force: bool = False,
    reassign_to: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a user from the system.
    
    Parameters:
    - user_id: ID of the user to delete
    - force: If True, allows deletion even if user is teaching courses
    - reassign_to: ID of another instructor to reassign courses to
    
    Safety checks:
    - Only admins can delete users
    - Cannot delete yourself
    - Cannot delete the last admin
    - If user is teaching courses, must either force delete or reassign
    """
    # Only admin can delete users
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Prevent admin from deleting themselves
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Find the user to delete
    user_to_delete = db.query(User).filter(User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user is referenced in courses as instructor
    from app.models.course import Course
    from app.models.attendance import Attendance
    
    # Additional safety check: prevent deletion of the last admin
    if user_to_delete.role.value == "admin":
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last admin user"
            )
    
    # Check courses where user is instructor
    courses_as_instructor = db.query(Course).filter(Course.instructor_id == user_id).all()
    if courses_as_instructor:
        if not force:
            # Option 1: Prevent deletion and show which courses are affected
            course_names = [course.name for course in courses_as_instructor]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete user. They are currently teaching the following courses: {', '.join(course_names)}. Use force=true to delete anyway, or provide reassign_to parameter to reassign courses."
            )
        elif reassign_to:
            # Option 2: Reassign courses to another instructor
            new_instructor = db.query(User).filter(User.id == reassign_to).first()
            if not new_instructor:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User with ID {reassign_to} not found for reassignment"
                )
            if new_instructor.role.value != "instructor" and new_instructor.role.value != "admin":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User with ID {reassign_to} is not an instructor or admin"
                )
            
            # Prevent reassigning to the same user
            if reassign_to == user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot reassign courses to the same user being deleted"
                )
            
            # Check if the new instructor is active
            if not new_instructor.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User with ID {reassign_to} is not active and cannot be assigned courses"
                )
            
            # Reassign all courses
            try:
                for course in courses_as_instructor:
                    course.instructor_id = reassign_to
                    course.updated_at = datetime.utcnow()
                
                db.commit()
                
                # Verify reassignment was successful
                remaining_courses = db.query(Course).filter(Course.instructor_id == user_id).count()
                if remaining_courses > 0:
                    raise Exception(f"Failed to reassign {remaining_courses} courses")
                    
            except Exception as e:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to reassign courses: {str(e)}"
                )
        else:
            # Option 3: Force delete without reassignment (courses will be orphaned)
            # This might not be ideal but allows the operation
            # For force delete, we need to handle the foreign key constraint differently
            # We'll set the instructor_id to NULL or delete the courses
            try:
                # Option: Set instructor_id to NULL for orphaned courses
                # This requires the column to be nullable, which it currently isn't
                # So we'll need to delete the courses instead
                for course in courses_as_instructor:
                    db.delete(course)
                db.commit()
                
                # Verify courses were deleted
                remaining_courses = db.query(Course).filter(Course.instructor_id == user_id).count()
                if remaining_courses > 0:
                    raise Exception(f"Failed to delete {remaining_courses} courses during force deletion")
                    
            except Exception as e:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to delete courses during force deletion: {str(e)}"
                )
    
    # Check attendance records where user is involved
    attendance_records = db.query(Attendance).filter(
        (Attendance.user_id == user_id) | (Attendance.instructor_id == user_id)
    ).all()
    
    if attendance_records:
        # Delete attendance records (since they're historical data)
        try:
            for record in attendance_records:
                db.delete(record)
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete attendance records: {str(e)}"
            )
    
    # Remove user from course enrollments
    from sqlalchemy import text
    try:
        db.execute(text("DELETE FROM course_students WHERE student_id = :user_id"), {"user_id": user_id})
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove course enrollments: {str(e)}"
        )
    
    # Final safety check: ensure no other references exist
    remaining_courses = db.query(Course).filter(Course.instructor_id == user_id).count()
    if remaining_courses > 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to handle {remaining_courses} courses. User deletion aborted."
        )
    
    # Additional check for any remaining attendance records
    remaining_attendance = db.query(Attendance).filter(
        (Attendance.user_id == user_id) | (Attendance.instructor_id == user_id)
    ).count()
    if remaining_attendance > 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete {remaining_attendance} attendance records. User deletion aborted."
        )
    
    # Check for any remaining course enrollments
    remaining_enrollments = db.execute(
        text("SELECT COUNT(*) FROM course_students WHERE student_id = :user_id"), 
        {"user_id": user_id}
    ).scalar()
    if remaining_enrollments > 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove {remaining_enrollments} course enrollments. User deletion aborted."
        )
    
    # Now delete the user
    try:
        db.delete(user_to_delete)
        db.commit()
        
        return {
            "message": "User deleted successfully",
            "details": {
                "user_id": user_id,
                "user_name": user_to_delete.name,
                "courses_reassigned": len(courses_as_instructor) if reassign_to else 0,
                "courses_deleted": len(courses_as_instructor) if force and not reassign_to else 0,
                "attendance_records_deleted": len(attendance_records),
                "enrollments_removed": "Yes"
            }
        }
    except Exception as e:
        db.rollback()
        # Log the error for debugging
        print(f"Error deleting user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List
from datetime import datetime, timedelta

from app.core.deps import get_db
from app.models.user import User, UserRole
from app.models.attendance import Attendance
from app.models.course import Course
from app.auth.routes import get_current_user

router = APIRouter()

@router.get("/debug")
def debug_admin_route(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to test database connectivity"""
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access debug endpoint"
        )
    
    try:
        # Test basic database queries
        user_count = db.query(User).count()
        course_count = db.query(Course).count()
        attendance_count = db.query(Attendance).count()
        
        # Test if we can access created_at fields
        sample_user = db.query(User).first()
        sample_course = db.query(Course).first()
        sample_attendance = db.query(Attendance).first()
        
        return {
            "status": "success",
            "database_connection": "working",
            "counts": {
                "users": user_count,
                "courses": course_count,
                "attendance": attendance_count
            },
            "sample_data": {
                "user_created_at": sample_user.created_at.isoformat() if sample_user and sample_user.created_at else None,
                "course_created_at": sample_course.created_at.isoformat() if sample_course and sample_course.created_at else None,
                "attendance_created_at": sample_attendance.created_at.isoformat() if sample_attendance and sample_attendance.created_at else None
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }

@router.get("/dashboard/stats")
def get_admin_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get system-wide statistics for admin dashboard"""
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access dashboard stats"
        )
    
    try:
        # Get user counts
        total_users = db.query(User).count()
        total_students = db.query(User).filter(User.role == UserRole.student).count()
        total_instructors = db.query(User).filter(User.role == UserRole.instructor).count()
        total_courses = db.query(Course).count()
        
        # Calculate daily attendance percentage (simplified)
        try:
            today = datetime.now().date()
            today_start = datetime.combine(today, datetime.min.time())
            today_end = datetime.combine(today, datetime.max.time())
            
            # Get today's attendance records
            today_attendance = db.query(Attendance).filter(
                Attendance.created_at >= today_start,
                Attendance.created_at <= today_end
            ).all()
            
            # Calculate attendance rate for today
            if today_attendance:
                present_count = len([a for a in today_attendance if a.status.value == "present"])
                daily_attendance_rate = (present_count / len(today_attendance)) * 100
            else:
                daily_attendance_rate = 0.0
        except Exception as attendance_error:
            # If attendance calculation fails, use a default value
            daily_attendance_rate = 0.0
        
        # Calculate system uptime (simplified - in real app this would track actual uptime)
        system_uptime = "99.9%"  # This would be calculated from actual system logs
        
        # Mock storage stats (in real app this would come from system monitoring)
        storage_used = 247  # MB
        storage_total = 500  # MB
        
        return {
            "total_users": total_users,
            "total_students": total_students,
            "total_instructors": total_instructors,
            "total_courses": total_courses,
            "daily_attendance": round(daily_attendance_rate, 1),
            "system_uptime": system_uptime,
            "storage_used": storage_used,
            "storage_total": storage_total
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard stats: {str(e)}"
        )

@router.get("/dashboard/activity")
def get_admin_dashboard_activity(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent system activity for admin dashboard"""
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access dashboard activity"
        )
    
    try:
        recent_activities = []
        
        # Get recent attendance activities (with error handling)
        try:
            recent_attendance = db.query(Attendance).order_by(
                desc(Attendance.created_at)
            ).limit(limit).all()
            
            for attendance in recent_attendance:
                try:
                    # Get user and instructor names
                    user = db.query(User).filter(User.id == attendance.user_id).first()
                    instructor = db.query(User).filter(User.id == attendance.instructor_id).first()
                    
                    if user and instructor:
                        activity = {
                            "id": f"attendance_{attendance.id}",
                            "type": "attendance",
                            "user": instructor.name,
                            "action": f"Marked {user.name} as {attendance.status.value} in {attendance.course_name}",
                            "timestamp": attendance.created_at.isoformat() if attendance.created_at else datetime.now().isoformat(),
                            "status": "success"
                        }
                        recent_activities.append(activity)
                except Exception as e:
                    # Skip this attendance record if there's an error
                    continue
        except Exception as e:
            # If attendance query fails, continue with other activities
            pass
        
        # Get recent user registrations (users created in last 7 days)
        try:
            week_ago = datetime.now() - timedelta(days=7)
            recent_users = db.query(User).filter(
                User.created_at >= week_ago
            ).order_by(desc(User.created_at)).limit(5).all()
            
            for user in recent_users:
                try:
                    if user.created_at:
                        activity = {
                            "id": f"user_{user.id}",
                            "type": "registration",
                            "user": user.name,
                            "action": f"New {user.role.value} account created",
                            "timestamp": user.created_at.isoformat(),
                            "status": "success"
                        }
                        recent_activities.append(activity)
                except Exception as e:
                    # Skip this user if there's an error
                    continue
        except Exception as e:
            # If user query fails, continue with other activities
            pass
        
        # Get recent course activities
        try:
            recent_courses = db.query(Course).order_by(
                desc(Course.created_at)
            ).limit(5).all()
            
            for course in recent_courses:
                try:
                    if hasattr(course, 'created_at') and course.created_at:
                        activity = {
                            "id": f"course_{course.id}",
                            "type": "course",
                            "user": "Admin",
                            "action": f"Course '{course.name}' created",
                            "timestamp": course.created_at.isoformat(),
                            "status": "success"
                        }
                        recent_activities.append(activity)
                except Exception as e:
                    # Skip this course if there's an error
                    continue
        except Exception as e:
            # If course query fails, continue with other activities
            pass
        
        # Sort all activities by timestamp (most recent first)
        try:
            recent_activities.sort(key=lambda x: x["timestamp"], reverse=True)
        except Exception as e:
            # If sorting fails, keep original order
            pass
        
        # Limit to requested number
        recent_activities = recent_activities[:limit]
        
        # Format timestamps for display
        for activity in recent_activities:
            try:
                timestamp = datetime.fromisoformat(activity["timestamp"])
                now = datetime.now()
                diff = now - timestamp
                
                if diff.days > 0:
                    activity["timestamp_display"] = f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
                elif diff.seconds > 3600:
                    hours = diff.seconds // 3600
                    activity["timestamp_display"] = f"{hours} hour{'s' if hours != 1 else ''} ago"
                elif diff.seconds > 60:
                    minutes = diff.seconds // 60
                    activity["timestamp_display"] = f"{minutes} minute{'s' if minutes != 1 else ''} ago"
                else:
                    activity["timestamp_display"] = "Just now"
            except Exception as e:
                # If timestamp formatting fails, use a default
                activity["timestamp_display"] = "Recently"
        
        return recent_activities
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard activity: {str(e)}"
        )

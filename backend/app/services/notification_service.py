from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationType, NotificationPriority
from app.models.user import User
from typing import Optional, List
from datetime import datetime

class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        title: str,
        message: str,
        notification_type: NotificationType,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[int] = None
    ) -> Notification:
        """Create a notification for a specific user"""
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            priority=priority,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification
    
    @staticmethod
    def notify_course_enrollment(
        db: Session,
        student_id: int,
        instructor_id: int,
        course_name: str,
        course_code: str
    ):
        """Notify instructor when a student enrolls in their course"""
        # Notify instructor
        NotificationService.create_notification(
            db=db,
            user_id=instructor_id,
            title="New Student Enrollment",
            message=f"A new student has enrolled in {course_name} ({course_code})",
            notification_type=NotificationType.COURSE_ENROLLMENT,
            priority=NotificationPriority.MEDIUM,
            related_entity_type="course",
            related_entity_id=student_id
        )
        
        # Notify student
        NotificationService.create_notification(
            db=db,
            user_id=student_id,
            title="Course Enrollment Successful",
            message=f"You have successfully enrolled in {course_name} ({course_code})",
            notification_type=NotificationType.COURSE_ENROLLMENT,
            priority=NotificationPriority.LOW,
            related_entity_type="course",
            related_entity_id=student_id
        )
    
    @staticmethod
    def notify_attendance_marked(
        db: Session,
        student_id: int,
        instructor_id: int,
        course_name: str,
        course_code: str,
        status: str
    ):
        """Notify when attendance is marked"""
        # Notify instructor
        NotificationService.create_notification(
            db=db,
            user_id=instructor_id,
            title="Attendance Marked",
            message=f"Attendance marked for a student in {course_name} ({course_code}) - Status: {status}",
            notification_type=NotificationType.ATTENDANCE_MARKED,
            priority=NotificationPriority.LOW,
            related_entity_type="attendance",
            related_entity_id=student_id
        )
        
        # Notify student
        NotificationService.create_notification(
            db=db,
            user_id=student_id,
            title="Attendance Recorded",
            message=f"Your attendance has been recorded for {course_name} ({course_code}) - Status: {status}",
            notification_type=NotificationType.ATTENDANCE_MARKED,
            priority=NotificationPriority.LOW,
            related_entity_type="attendance",
            related_entity_id=student_id
        )
    
    @staticmethod
    def notify_course_created(
        db: Session,
        course_name: str,
        course_code: str,
        instructor_id: int
    ):
        """Notify when a new course is created"""
        NotificationService.create_notification(
            db=db,
            user_id=instructor_id,
            title="Course Created",
            message=f"Your course {course_name} ({course_code}) has been created successfully",
            notification_type=NotificationType.COURSE_CREATED,
            priority=NotificationPriority.MEDIUM,
            related_entity_type="course",
            related_entity_id=instructor_id
        )
    
    @staticmethod
    def notify_course_updated(
        db: Session,
        course_name: str,
        course_code: str,
        instructor_id: int
    ):
        """Notify when a course is updated"""
        NotificationService.create_notification(
            db=db,
            user_id=instructor_id,
            title="Course Updated",
            message=f"Your course {course_name} ({course_code}) has been updated",
            notification_type=NotificationType.COURSE_UPDATED,
            priority=NotificationPriority.LOW,
            related_entity_type="course",
            related_entity_id=instructor_id
        )
    
    @staticmethod
    def notify_course_deleted(
        db: Session,
        course_name: str,
        course_code: str,
        instructor_id: int,
        enrolled_students: List[int]
    ):
        """Notify when a course is deleted"""
        # Notify instructor
        NotificationService.create_notification(
            db=db,
            user_id=instructor_id,
            title="Course Deleted",
            message=f"Your course {course_name} ({course_code}) has been deleted",
            notification_type=NotificationType.COURSE_DELETED,
            priority=NotificationPriority.HIGH,
            related_entity_type="course",
            related_entity_id=instructor_id
        )
        
        # Notify all enrolled students
        for student_id in enrolled_students:
            NotificationService.create_notification(
                db=db,
                user_id=student_id,
                title="Course Cancelled",
                message=f"The course {course_name} ({course_code}) has been cancelled and removed from your schedule",
                notification_type=NotificationType.COURSE_DELETED,
                priority=NotificationPriority.HIGH,
                related_entity_type="course",
                related_entity_id=student_id
            )
    
    @staticmethod
    def notify_face_enrollment(
        db: Session,
        user_id: int,
        success: bool
    ):
        """Notify when face enrollment is completed"""
        if success:
            NotificationService.create_notification(
                db=db,
                user_id=user_id,
                title="Face Enrollment Successful",
                message="Your face has been successfully enrolled for attendance tracking",
                notification_type=NotificationType.FACE_ENROLLMENT,
                priority=NotificationPriority.MEDIUM,
                related_entity_type="user",
                related_entity_id=user_id
            )
        else:
            NotificationService.create_notification(
                db=db,
                user_id=user_id,
                title="Face Enrollment Failed",
                message="Face enrollment failed. Please try again or contact support.",
                notification_type=NotificationType.FACE_ENROLLMENT,
                priority=NotificationPriority.HIGH,
                related_entity_type="user",
                related_entity_id=user_id
            )
    
    @staticmethod
    def notify_attendance_session_started(
        db: Session,
        course_name: str,
        course_code: str,
        enrolled_students: List[int]
    ):
        """Notify students when an attendance session starts"""
        for student_id in enrolled_students:
            NotificationService.create_notification(
                db=db,
                user_id=student_id,
                title="Attendance Session Started",
                message=f"Attendance session has started for {course_name} ({course_code}). Please be present for face recognition.",
                notification_type=NotificationType.ATTENDANCE_SESSION,
                priority=NotificationPriority.HIGH,
                related_entity_type="course",
                related_entity_id=student_id
            )
    
    @staticmethod
    def notify_system_alert(
        db: Session,
        user_ids: List[int],
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM
    ):
        """Send system alerts to multiple users"""
        for user_id in user_ids:
            NotificationService.create_notification(
                db=db,
                user_id=user_id,
                title=title,
                message=message,
                notification_type=NotificationType.SYSTEM_ALERT,
                priority=priority,
                related_entity_type="system",
                related_entity_id=None
            )
    
    @staticmethod
    def notify_welcome_user(
        db: Session,
        user_id: int,
        user_name: str,
        user_role: str
    ):
        """Send welcome notification to new users"""
        NotificationService.create_notification(
            db=db,
            user_id=user_id,
            title="Welcome to SmartFaceTrack!",
            message=f"Welcome {user_name}! You have been registered as a {user_role}. Start exploring the system!",
            notification_type=NotificationType.USER_REGISTERED,
            priority=NotificationPriority.MEDIUM,
            related_entity_type="user",
            related_entity_id=user_id
        )
    
    @staticmethod
    def notify_role_specific_alert(
        db: Session,
        user_role: str,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        exclude_user_ids: Optional[List[int]] = None
    ):
        """Send notifications to all users of a specific role"""
        from app.models.user import User
        
        query = db.query(User).filter(User.role == user_role)
        if exclude_user_ids:
            query = query.filter(User.id.notin_(exclude_user_ids))
        
        users = query.all()
        user_ids = [user.id for user in users]
        
        if user_ids:
            NotificationService.notify_system_alert(db, user_ids, title, message, priority)
    
    @staticmethod
    def notify_all_users(
        db: Session,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        exclude_user_ids: Optional[List[int]] = None
    ):
        """Send notifications to all users in the system"""
        from app.models.user import User
        
        query = db.query(User)
        if exclude_user_ids:
            query = query.filter(User.id.notin_(exclude_user_ids))
        
        users = query.all()
        user_ids = [user.id for user in users]
        
        if user_ids:
            NotificationService.notify_system_alert(db, user_ids, title, message, priority)

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class NotificationType(str, enum.Enum):
    COURSE_ENROLLMENT = "course_enrollment"
    ATTENDANCE_MARKED = "attendance_marked"
    COURSE_CREATED = "course_created"
    COURSE_UPDATED = "course_updated"
    COURSE_DELETED = "course_deleted"
    USER_REGISTERED = "user_registered"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    SYSTEM_ALERT = "system_alert"
    FACE_ENROLLMENT = "face_enrollment"
    ATTENDANCE_SESSION = "attendance_session"

class NotificationPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(Enum(NotificationType), nullable=False)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.MEDIUM)
    is_read = Column(Boolean, default=False)
    related_entity_type = Column(String(50), nullable=True)  # e.g., "course", "user", "attendance"
    related_entity_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    
    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.notification_type})>"

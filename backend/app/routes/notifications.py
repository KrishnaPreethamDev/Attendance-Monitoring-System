from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.core.deps import get_db
from app.auth.routes import get_current_user
from app.models.user import User
from app.models.notification import Notification, NotificationType, NotificationPriority
from app.schemas import (
    NotificationCreate, 
    NotificationUpdate, 
    NotificationResponse, 
    NotificationListResponse
)

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=NotificationListResponse)
def get_user_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications for the current user"""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    total_count = query.count()
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    
    return NotificationListResponse(
        notifications=notifications,
        total_count=total_count,
        unread_count=unread_count
    )

@router.get("/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications for the current user"""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    return {"unread_count": count}

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notification)
    
    return notification

@router.patch("/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for the current user"""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.now(timezone.utc)
    })
    
    db.commit()
    
    return {"message": "All notifications marked as read"}

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a notification"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    db.delete(notification)
    db.commit()
    
    return {"message": "Notification deleted"}

@router.delete("/")
def delete_all_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all notifications for the current user"""
    db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).delete()
    
    db.commit()
    
    return {"message": "All notifications deleted"}

# Admin endpoints for system-wide notifications
@router.post("/system", response_model=NotificationResponse)
def create_system_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a system notification (admin only)"""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create system notifications"
        )
    
    notification = Notification(**notification_data.dict())
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return notification

@router.post("/broadcast", response_model=List[NotificationResponse])
def broadcast_notification(
    notification_data: NotificationCreate,
    user_roles: Optional[List[str]] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Broadcast notification to multiple users (admin only)"""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can broadcast notifications"
        )
    
    # Get users to notify
    query = db.query(User)
    if user_roles:
        query = query.filter(User.role.in_(user_roles))
    
    users = query.all()
    
    notifications = []
    for user in users:
        notification = Notification(
            user_id=user.id,
            title=notification_data.title,
            message=notification_data.message,
            notification_type=notification_data.notification_type,
            priority=notification_data.priority,
            related_entity_type=notification_data.related_entity_type,
            related_entity_id=notification_data.related_entity_id
        )
        db.add(notification)
        notifications.append(notification)
    
    db.commit()
    
    # Refresh all notifications to get IDs
    for notification in notifications:
        db.refresh(notification)
    
    return notifications

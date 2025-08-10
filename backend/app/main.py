# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth.routes import router as auth_router
from app.face.routes import router as face_router
from app.routes.attendance import router as attendance_router
from app.routes.courses import router as courses_router
from app.routes.admin import router as admin_router
from app.routes.notifications import router as notification_router
from app.core.database import engine, Base
from app.models import user, attendance, course, notification

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmartFaceTrack API",
    description="Attendance Monitoring System with Face Recognition",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(face_router, prefix="/face", tags=["Face Recognition"])
app.include_router(attendance_router, prefix="/attendance", tags=["Attendance"])
app.include_router(courses_router, prefix="/courses", tags=["Courses"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(notification_router, prefix="/notifications", tags=["Notifications"])

@app.get("/")
def root():
    return {
        "message": "SmartFaceTrack API is running!",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SmartFaceTrack API"
    }

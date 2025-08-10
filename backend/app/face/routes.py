# backend/app/face/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import base64
import io
from PIL import Image
import numpy as np
from deepface import DeepFace
import os

from app.core.deps import get_db
from app.models.user import User
from app.schemas import (
    FaceCompareResult, FaceEmbeddingResponse, FaceRegisterRequest, FaceVerifyRequest
)
from app.auth.routes import get_current_user
from app.services.notification_service import NotificationService

router = APIRouter()

# Face recognition configuration
FACE_RECOGNITION_MODEL = os.getenv("FACE_RECOGNITION_MODEL", "Facenet")
FACE_RECOGNITION_THRESHOLD = float(os.getenv("FACE_RECOGNITION_THRESHOLD", "0.6"))

def extract_face_embedding(image_data: bytes) -> List[float]:
    """Extract face embedding from image data"""
    try:
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Extract embedding using DeepFace
        embedding = DeepFace.represent(
            img_path=img_array,
            model_name=FACE_RECOGNITION_MODEL,
            enforce_detection=False
        )
        
        if embedding:
            return embedding[0]["embedding"]
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No face detected in the image"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error processing image: {str(e)}"
        )

def compare_embeddings(embedding1: List[float], embedding2: List[float]) -> float:
    """Compare two face embeddings and return similarity score"""
    try:
        # Convert to numpy arrays
        emb1 = np.array(embedding1)
        emb2 = np.array(embedding2)
        
        # Calculate cosine similarity
        similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
        return float(similarity)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error comparing embeddings: {str(e)}"
        )

@router.post("/register-face")
def register_face(
    request: FaceRegisterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register face data for a user"""
    try:
        # Decode base64 image
        image_data = base64.b64decode(request.face_data.split(',')[1] if ',' in request.face_data else request.face_data)
        
        # Extract face embedding
        embedding = extract_face_embedding(image_data)
        
        # Update user's face data
        current_user.face_data = request.face_data
        db.commit()
        
        # Create notification for successful face enrollment
        try:
            NotificationService.notify_face_enrollment(
                db=db,
                user_id=current_user.id,
                success=True
            )
        except Exception as e:
            # Log error but don't fail the face registration
            print(f"Failed to create notification: {e}")
        
        return {
            "message": "Face registered successfully",
            "user_id": current_user.id
        }
    except Exception as e:
        # Create notification for failed face enrollment
        try:
            NotificationService.notify_face_enrollment(
                db=db,
                user_id=current_user.id,
                success=False
            )
        except Exception as notification_error:
            # Log error but don't fail the face registration
            print(f"Failed to create failure notification: {notification_error}")
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error registering face: {str(e)}"
        )

@router.post("/verify", response_model=FaceCompareResult)
def verify_face(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Verify face against registered users"""
    try:
        # Read uploaded image
        image_data = file.file.read()
        
        # Extract face embedding from uploaded image
        uploaded_embedding = extract_face_embedding(image_data)
        
        # Get all users with face data
        users_with_faces = db.query(User).filter(User.face_data.isnot(None)).all()
        
        best_match = None
        best_confidence = 0
        
        for user in users_with_faces:
            try:
                # Decode user's face data
                user_image_data = base64.b64decode(user.face_data.split(',')[1] if ',' in user.face_data else user.face_data)
                
                # Extract embedding from user's face data
                user_embedding = extract_face_embedding(user_image_data)
                
                # Compare embeddings
                confidence = compare_embeddings(uploaded_embedding, user_embedding)
                
                if confidence > best_confidence and confidence >= FACE_RECOGNITION_THRESHOLD:
                    best_confidence = confidence
                    best_match = user
                    
            except Exception as e:
                # Skip users with invalid face data
                continue
        
        if best_match:
            return FaceCompareResult(
                match=True,
                confidence=best_confidence,
                user=best_match
            )
        else:
            return FaceCompareResult(
                match=False,
                confidence=0.0
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error verifying face: {str(e)}"
        )

@router.post("/verify-base64", response_model=FaceCompareResult)
def verify_face_base64(
    request: FaceVerifyRequest,
    db: Session = Depends(get_db)
):
    """Verify face using base64 encoded image"""
    try:
        # Decode base64 image
        image_data = base64.b64decode(request.face_data.split(',')[1] if ',' in request.face_data else request.face_data)
        
        # Extract face embedding
        uploaded_embedding = extract_face_embedding(image_data)
        
        # Get all users with face data
        users_with_faces = db.query(User).filter(User.face_data.isnot(None)).all()
        
        best_match = None
        best_confidence = 0
        
        for user in users_with_faces:
            try:
                # Decode user's face data
                user_image_data = base64.b64decode(user.face_data.split(',')[1] if ',' in user.face_data else user.face_data)
                
                # Extract embedding from user's face data
                user_embedding = extract_face_embedding(user_image_data)
                
                # Compare embeddings
                confidence = compare_embeddings(uploaded_embedding, user_embedding)
                
                if confidence > best_confidence and confidence >= FACE_RECOGNITION_THRESHOLD:
                    best_confidence = confidence
                    best_match = user
                    
            except Exception as e:
                # Skip users with invalid face data
                continue
        
        if best_match:
            return FaceCompareResult(
                match=True,
                confidence=best_confidence,
                user=best_match
            )
        else:
            return FaceCompareResult(
                match=False,
                confidence=0.0
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error verifying face: {str(e)}"
        )

@router.post("/extract-embedding", response_model=FaceEmbeddingResponse)
def extract_embedding(file: UploadFile = File(...)):
    """Extract face embedding from uploaded image"""
    try:
        # Read uploaded image
        image_data = file.file.read()
        
        # Extract face embedding
        embedding = extract_face_embedding(image_data)
        
        return FaceEmbeddingResponse(embedding=embedding)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error extracting embedding: {str(e)}"
        )

@router.post("/compare")
def compare_embeddings_endpoint(
    embedding1: List[float],
    embedding2: List[float]
):
    """Compare two face embeddings"""
    try:
        similarity = compare_embeddings(embedding1, embedding2)
        return {
            "similarity": similarity,
            "match": similarity >= FACE_RECOGNITION_THRESHOLD
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error comparing embeddings: {str(e)}"
        )

@router.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": FACE_RECOGNITION_MODEL,
        "threshold": FACE_RECOGNITION_THRESHOLD
    }

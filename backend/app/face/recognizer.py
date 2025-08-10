# backend/app/face/recognizer.py
from deepface import DeepFace
import numpy as np
from PIL import Image
import io

def extract_face_embedding(image_bytes: bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_np = np.array(img)
    try:
        embedding = DeepFace.represent(img_path=img_np, model_name='Facenet')[0]["embedding"]
        return np.array(embedding, dtype=np.float32)
    except Exception as e:
        print("Face embedding error:", e)
        return None

def compare_embeddings(embedding1, embedding2, threshold=0.6):
    distance = np.linalg.norm(embedding1 - embedding2)
    return distance < threshold

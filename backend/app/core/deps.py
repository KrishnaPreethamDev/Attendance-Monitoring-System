# backend/app/core/deps.py

from sqlalchemy.orm import Session
from .database import SessionLocal

# Dependency to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

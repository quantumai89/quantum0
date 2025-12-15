"""
Database Configuration
SQLAlchemy setup and session management
"""
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from models.auth_models import Base

# Database configuration
DATABASE_DIR = Path(__file__).parent
DATABASE_PATH = DATABASE_DIR / 'quantum_ai.db'
DATABASE_URL = os.getenv('DATABASE_URL', f'sqlite:///{DATABASE_PATH}')

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={'check_same_thread': False} if 'sqlite' in DATABASE_URL else {},
    echo=False  # Set to True for SQL query logging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create scoped session for thread safety
db_session = scoped_session(SessionLocal)


def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)
    print(f"✓ Database initialized at {DATABASE_PATH}")


def get_db():
    """Get database session (for dependency injection)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def close_db():
    """Close database connection"""
    db_session.remove()

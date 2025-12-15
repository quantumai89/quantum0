"""
Authentication Service
Business logic for user authentication and JWT token management
"""
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
import jwt
from sqlalchemy.orm import Session
from models.auth_models import User, RefreshToken

# JWT Configuration
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-super-secret-jwt-key-change-this-in-production')
JWT_ALGORITHM = 'HS256'
JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))  # 1 hour
JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 2592000))  # 30 days


class AuthService:
    """Authentication service for user management and JWT tokens"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def register_user(self, email: str, password: str, first_name: str, last_name: str) -> User:
        """
        Register a new user
        
        Args:
            email: User email
            password: Plain text password
            first_name: User first name
            last_name: User last name
            
        Returns:
            User object
            
        Raises:
            ValueError: If email already exists or validation fails
        """
        # Validate email
        email = email.lower().strip()
        if not email or '@' not in email:
            raise ValueError('Invalid email address')
        
        # Check if user already exists
        existing_user = self.db.query(User).filter(User.email == email).first()
        if existing_user:
            raise ValueError('Email already registered')
        
        # Validate password
        if not password or len(password) < 6:
            raise ValueError('Password must be at least 6 characters')
        
        # Validate names
        if not first_name or not last_name:
            raise ValueError('First name and last name are required')
        
        # Create new user
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            first_name=first_name.strip(),
            last_name=last_name.strip()
        )
        user.set_password(password)
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def login_user(self, email: str, password: str) -> Tuple[User, str, str]:
        """
        Login user and generate tokens
        
        Args:
            email: User email
            password: Plain text password
            
        Returns:
            Tuple of (User, access_token, refresh_token)
            
        Raises:
            ValueError: If credentials are invalid
        """
        # Find user
        email = email.lower().strip()
        user = self.db.query(User).filter(User.email == email).first()
        
        if not user or not user.check_password(password):
            raise ValueError('Invalid email or password')
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        self.db.commit()
        
        # Generate tokens
        access_token = self._generate_access_token(user)
        refresh_token = self._create_refresh_token(user)
        
        return user, access_token, refresh_token
    
    def refresh_access_token(self, refresh_token_str: str) -> Tuple[str, User]:
        """
        Refresh access token using refresh token
        
        Args:
            refresh_token_str: Refresh token string
            
        Returns:
            Tuple of (new_access_token, User)
            
        Raises:
            ValueError: If refresh token is invalid or expired
        """
        # Find refresh token
        refresh_token = self.db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token_str
        ).first()
        
        if not refresh_token:
            raise ValueError('Invalid refresh token')
        
        if refresh_token.is_expired():
            # Delete expired token
            self.db.delete(refresh_token)
            self.db.commit()
            raise ValueError('Refresh token expired')
        
        # Get user
        user = refresh_token.user
        if not user:
            raise ValueError('User not found')
        
        # Generate new access token
        access_token = self._generate_access_token(user)
        
        return access_token, user
    
    def logout_user(self, refresh_token_str: str):
        """
        Logout user by invalidating refresh token
        
        Args:
            refresh_token_str: Refresh token to invalidate
        """
        refresh_token = self.db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token_str
        ).first()
        
        if refresh_token:
            self.db.delete(refresh_token)
            self.db.commit()
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def verify_access_token(self, token: str) -> Optional[Dict]:
        """
        Verify and decode access token
        
        Args:
            token: JWT access token
            
        Returns:
            Decoded token payload or None if invalid
        """
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def _generate_access_token(self, user: User) -> str:
        """Generate JWT access token"""
        payload = {
            'user_id': user.id,
            'email': user.email,
            'exp': datetime.utcnow() + timedelta(seconds=JWT_ACCESS_TOKEN_EXPIRES),
            'iat': datetime.utcnow(),
            'type': 'access'
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    def _create_refresh_token(self, user: User) -> str:
        """Create and store refresh token"""
        # Clean up old expired tokens for this user
        self.db.query(RefreshToken).filter(
            RefreshToken.user_id == user.id,
            RefreshToken.expires_at < datetime.utcnow()
        ).delete()
        
        # Create new refresh token
        refresh_token = RefreshToken.create_for_user(
            user.id,
            expires_in_days=JWT_REFRESH_TOKEN_EXPIRES // 86400  # Convert seconds to days
        )
        
        self.db.add(refresh_token)
        self.db.commit()
        
        return refresh_token.token

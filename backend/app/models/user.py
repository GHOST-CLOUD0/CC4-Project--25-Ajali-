from datetime import datetime, timezone
from operator import index
from werkzeug.security import generate_password_hash, check_password_hash
from backend.app import db
from app.extensions import db

class UserRole:
    CITIZEN = "citizen"
    ADMIN = "admin"
    
    ALL = [CITIZEN, ADMIN]
    
class User(db.Model):
    __table__ = "users"
    id = db.Column(db.String(80), unique=True, nullable=False, index=True)    
    username = db.Column(db.String(255), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default=UserRole.CITIZEN)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime, 
        nullable=False, 
        default=datetime.now(timezone.utc), 
        onupdate=datetime.now(timezone.utc)
    )
    
    incidents = db.relationship(
        "Inidents",
        back_polulate="author",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    @property
    def is_admin(self):
        return self.role == UserRole.ADMIN
    
    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        
        def __repr__(self):
            return f"<User {slef.id} - {self.username}>"
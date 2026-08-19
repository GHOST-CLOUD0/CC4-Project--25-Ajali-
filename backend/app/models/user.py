from datetime import datetime, timezone

from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db

class UserRole:
    CITIZEN = "citizen"
    ADMIN = "admin"
    
    ALL = [CITIZEN, ADMIN]
    
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(80), primary_key=True)
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
        "Incident",
        back_populates="author",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    @property
    def password(self):
        """Password is write-only; only its secure hash is persisted."""
        raise AttributeError("Password is write-only")

    @password.setter
    def password(self, password):
        self.set_password(password)

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
        return f"<User {self.id} - {self.username}>"

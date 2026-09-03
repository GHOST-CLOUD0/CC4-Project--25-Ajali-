from datetime import datetime, timezone
from uuid import uuid4

from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db

class UserRole:
    CITIZEN = "citizen"
    ADMIN = "admin"
    
    ALL = [CITIZEN, ADMIN]
    
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(80), primary_key=True, default=lambda: str(uuid4()))
    username = db.Column(db.String(255), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default=UserRole.CITIZEN)
    
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime, 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
    
    incidents = db.relationship(
        "Incident",
        back_populates="author",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    def __init__(
        self,
        username: str,
        email: str,
        role: str = UserRole.CITIZEN,
        password_hash: str | None = None,
        **kwargs,
    ):
        super().__init__()
        self.username = username
        self.email = email
        self.role = role
        self.password_hash = password_hash or ""
        for key, value in kwargs.items():
            setattr(self, key, value)

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
        created = self.created_at
        if created and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        updated = self.updated_at
        if updated and updated.tzinfo is None:
            updated = updated.replace(tzinfo=timezone.utc)

        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "created_at": created.isoformat() if created else None,
            "updated_at": updated.isoformat() if updated else None,
        }
        
    def __repr__(self):
        return f"<User {self.id} - {self.username}>"

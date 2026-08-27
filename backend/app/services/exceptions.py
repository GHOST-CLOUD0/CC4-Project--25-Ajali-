class ServiceError(Exception):
    """Base exception for all service layer business errors."""

    status_code = 500

    def __init__(self, message="An internal service error occurred.", status_code=None):
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code


class ValidationError(ServiceError):
    """Raised when incoming business parameters or domain rules fail validation."""

    status_code = 400


class AuthenticationError(ServiceError):
    """Raised when authentication credentials or tokens are invalid."""

    status_code = 401


class ForbiddenError(ServiceError):
    """Raised when an action is forbidden due to role or ownership permissions."""

    status_code = 403


class NotFoundError(ServiceError):
    """Raised when a requested resource cannot be found."""

    status_code = 404


class ConflictError(ServiceError):
    """Raised when a resource conflict occurs (e.g. duplicate username/email)."""

    status_code = 409


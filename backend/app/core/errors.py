"""Error utilities to eliminate duplicate HTTPException patterns."""

from fastapi import HTTPException, status


def raise_not_found(resource_name: str) -> None:
    """Raise 404 Not Found exception."""
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{resource_name} not found",
    )


def raise_forbidden(message: str = "Not enough permissions") -> None:
    """Raise 403 Forbidden exception."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=message,
    )


def raise_bad_request(message: str) -> None:
    """Raise 400 Bad Request exception."""
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=message,
    )


def raise_conflict(message: str) -> None:
    """Raise 409 Conflict exception."""
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=message,
    )


def require_found(resource: object | None, resource_name: str) -> None:
    """Raise 404 if resource is None."""
    if resource is None:
        raise_not_found(resource_name)


def require_permission(condition: bool, message: str = "Not enough permissions") -> None:
    """Raise 403 if condition is False."""
    if not condition:
        raise_forbidden(message)

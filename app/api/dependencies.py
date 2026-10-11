from fastapi import Header, HTTPException
import secrets

from app.config import settings


def verify_api_key(
    x_api_key: str | None = Header(default=None)
):
    # API key not provided
    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail="API key is required."
        )

    # API key not configured in .env
    if not settings.api_key:
        raise HTTPException(
            status_code=500,
            detail="API key is not configured on the server."
        )

    # Check API key
    if not secrets.compare_digest(
        x_api_key,
        settings.api_key
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid API key."
        )

    return True
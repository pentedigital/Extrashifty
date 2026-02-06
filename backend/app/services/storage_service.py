"""Storage service for ExtraShifty data exports."""

import logging
from pathlib import Path
from uuid import uuid4

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Local file storage for data exports.

    In production, replace with S3/GCS integration using presigned URLs.
    """

    def __init__(self) -> None:
        self.storage_dir = Path(
            settings.DATA_EXPORT_DIR or "/tmp/extrashifty-exports"
        )
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def save_export(self, user_id: int, data: str) -> str:
        """Save a data export and return the file path."""
        filename = f"export_{user_id}_{uuid4().hex}.json"
        path = self.storage_dir / filename
        path.write_text(data)
        logger.info(f"Saved data export for user {user_id}: {path}")
        return str(path)

    def delete_export(self, url: str) -> bool:
        """Delete a data export file. Returns True if deleted."""
        path = Path(url)
        if path.exists():
            path.unlink()
            logger.info(f"Deleted export file: {path}")
            return True
        logger.warning(f"Export file not found for deletion: {url}")
        return False

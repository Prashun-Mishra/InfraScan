import mimetypes
import os
from sqlalchemy.orm import Session
from app.models.media import MediaFile


def save_media_to_db(db: Session, url_path: str, local_path: str) -> None:
    """Persist a generated/uploaded media file into PostgreSQL/SQLite media_files table."""
    if not local_path or not os.path.exists(local_path):
        return
    norm_path = url_path.lstrip("/")
    content_type, _ = mimetypes.guess_type(local_path)
    if not content_type:
        content_type = "application/octet-stream"
    try:
        with open(local_path, "rb") as f:
            raw_bytes = f.read()
        existing = db.query(MediaFile).filter(MediaFile.path == norm_path).first()
        if existing:
            existing.data = raw_bytes
            existing.content_type = content_type
        else:
            db.add(MediaFile(path=norm_path, content_type=content_type, data=raw_bytes))
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[MediaStorage] Warning saving {norm_path} to DB: {e}")


def get_media_from_db(db: Session, url_path: str):
    """Retrieve a stored media file by relative URL path (e.g. 'uploads/raw/photo.jpg')."""
    norm_path = url_path.lstrip("/")
    return db.query(MediaFile).filter(MediaFile.path == norm_path).first()

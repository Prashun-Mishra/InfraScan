from sqlalchemy import Column, String, LargeBinary, DateTime
from sqlalchemy.sql import func
from app.db.session import Base


class MediaFile(Base):
    """Stores uploaded photos, masks, heatmaps, and reports in DB so they survive ephemeral container restarts."""

    __tablename__ = "media_files"

    path = Column(String, primary_key=True, index=True)
    content_type = Column(String, nullable=False, default="application/octet-stream")
    data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

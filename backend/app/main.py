import os
from fastapi import FastAPI, Depends, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api.v1.auth import router as auth_router
from app.api.v1.assets import router as assets_router
from app.api.v1.inspections import router as inspections_router
from app.api.v1.maintenance import router as maintenance_router
from app.api.v1.models import router as models_router
from app.api.v1.reports import router as reports_router
from sqlalchemy import text
from app.db.session import SessionLocal, engine, get_db
from app.db.init_db import init_db
from app.services.media_storage import get_media_from_db

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for InfraScan — AI-Powered Crack & Damage Assessment for Civil Infrastructure",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# CORS Middleware setup
# Merge base origins with any extra ones from env var
_cors_origins = list(settings.BACKEND_CORS_ORIGINS)
if settings.CORS_ORIGINS_EXTRA:
    _cors_origins += [o.strip() for o in settings.CORS_ORIGINS_EXTRA.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists and serve from disk with PostgreSQL/DB fallback
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


@app.get("/uploads/{file_path:path}")
def serve_upload(file_path: str, db: Session = Depends(get_db)):
    upload_root = os.path.abspath(settings.UPLOAD_DIR)
    target = os.path.abspath(os.path.join(upload_root, file_path))
    if not target.startswith(upload_root):
        raise HTTPException(status_code=403, detail="Invalid upload path")
    if os.path.isfile(target):
        return FileResponse(target)
    media = get_media_from_db(db, f"uploads/{file_path}")
    if media:
        return Response(content=media.data, media_type=media.content_type)
    raise HTTPException(status_code=404, detail="Media file not found")

# Startup database initialization
@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()

# Include API Routers
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication & Personnel"])
app.include_router(assets_router, prefix=f"{settings.API_V1_STR}/assets", tags=["Infrastructure Assets"])
app.include_router(inspections_router, prefix=f"{settings.API_V1_STR}/inspections", tags=["Inspections & AI Inference"])
app.include_router(maintenance_router, prefix=f"{settings.API_V1_STR}/work-orders", tags=["Maintenance Work Orders"])
app.include_router(models_router, prefix=f"{settings.API_V1_STR}/models", tags=["AI Model Benchmarks & Governance"])
app.include_router(reports_router, prefix=f"{settings.API_V1_STR}/reports", tags=["Inspection Audit Reports"])

@app.get("/")
def root():
    return {
        "platform": "InfraScan Enterprise Civil Infrastructure Assessment",
        "status": "online",
        "docs_url": "/docs",
        "version": settings.VERSION,
    }

@app.get("/health")
def health_check():
    db_status = "connected"
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    storage_writable = os.access(settings.UPLOAD_DIR, os.W_OK)

    return {
        "status": "healthy" if db_status == "connected" and storage_writable else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": {
            "status": db_status,
            "dialect": engine.dialect.name,
        },
        "storage": {
            "upload_dir": settings.UPLOAD_DIR,
            "writable": storage_writable,
        }
    }

@app.get("/ready")
def readiness_check():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"ready": True}

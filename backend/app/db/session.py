from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Database engine setup with resilient fallback
db_url = settings.DATABASE_URL
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        echo=False
    )
except Exception as e:
    print(f"Warning: Primary database connection failed ({e}). Falling back to SQLite.")
    db_url = "sqlite:///./infrascan.db"
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

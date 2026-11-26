# InfraScan Backend + YOLOv11 AI Pipeline (Hugging Face Spaces Docker SDK)
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app:/app/ai-model \
    YOLO_CONFIG_DIR=/tmp/Ultralytics \
    MPLCONFIGDIR=/tmp/matplotlib \
    PORT=7860

WORKDIR /app

# Install system dependencies for OpenCV and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (UID 1000 required by Hugging Face Spaces)
RUN useradd -m -u 1000 user

# Install Python dependencies (CPU-only PyTorch to keep image small and fast)
COPY backend/requirements.txt /app/backend-requirements.txt
COPY ai-model/requirements.txt /app/ai-requirements.txt

RUN pip install --no-cache-dir --default-timeout=1000 \
    torch torchvision \
    --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir --default-timeout=1000 -r /app/backend-requirements.txt \
    && pip install --no-cache-dir --default-timeout=1000 -r /app/ai-requirements.txt

# Copy backend and AI model code with UID 1000 ownership
COPY --chown=user:user backend /app/backend
COPY --chown=user:user ai-model /app/ai-model

WORKDIR /app/backend

# Ensure uploads, SQLite DB directory, and temp dirs are writable by UID 1000
RUN mkdir -p uploads/raw uploads/inspections uploads/preprocessed uploads/reports \
    && chown -R user:user /app/backend /app/ai-model \
    && chmod -R 775 /app/backend

USER user

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:7860/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]

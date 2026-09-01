# Dockerfile for FastAPI backend on GCP Cloud Run
FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsqlite3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Copy dependency specifications and install
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Place virtualenv on PATH
ENV PATH="/app/.venv/bin:$PATH"

# Copy backend application source code
COPY . .

# Expose default Cloud Run port
EXPOSE 8080

# Start FastAPI application using uvicorn binding to Cloud Run $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]

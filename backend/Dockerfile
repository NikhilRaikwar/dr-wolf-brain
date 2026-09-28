FROM python:3.12-slim

# Install system dependencies and Stockfish
RUN apt-get update && apt-get install -y --no-install-recommends \
    stockfish \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Build-time verification that Debian Stockfish binary exists, is executable, and accepts UCI commands
RUN test -x /usr/games/stockfish \
    && printf 'uci\nquit\n' | /usr/games/stockfish >/dev/null

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code and Alembic migrations
COPY . .

# Set default environment variables (Debian apt installs stockfish to /usr/games/stockfish)
ENV PYTHONUNBUFFERED=1
ENV STOCKFISH_PATH=/usr/games/stockfish
ENV PORT=8000

# Expose port
EXPOSE 8000

# Run migrations and start FastAPI server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]


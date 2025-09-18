FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy handler files
COPY handler_simple.py .
COPY handler.py .

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the handler
CMD ["python", "-u", "handler_simple.py"]
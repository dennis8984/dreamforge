FROM runpod/base:0.6.2-cuda12.2.0

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy handler
COPY handler.py .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV MODEL_PATH=/app/models

# Create model cache directory
RUN mkdir -p /app/models

# Run the handler
CMD ["python", "-u", "handler.py"]
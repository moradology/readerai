# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

COPY . .

# Install uv
RUN pip install --no-cache-dir uv
RUN uv pip compile pyproject.toml > /tmp/requirements.txt
RUN uv pip install -r /tmp/requirements.txt --system

# Define the command to run the application
# Use 0.0.0.0 to allow connections from outside the container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

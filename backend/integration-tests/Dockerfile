# Dockerfile for integration tests
FROM python:3.13-slim

WORKDIR /tests

# Install uv
RUN apt-get update && apt-get install -y curl && \
    curl -LsSf https://astral.sh/uv/install.sh | sh && \
    apt-get remove -y curl && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Add uv to PATH
ENV PATH="/root/.local/bin:${PATH}"

# Copy test dependencies
COPY pyproject.toml ./

# Install dependencies
RUN uv sync --frozen

# Copy tests
COPY . .

# Default command
CMD ["uv", "run", "pytest", "-v"]

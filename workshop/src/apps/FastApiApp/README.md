# FastAPI Workshop Files

This directory contains the FastAPI application files for the containerization workshop.

## Files

- `main.py` - Main FastAPI application
- `lambda_handler.py` - Lambda-specific handler using Mangum
- `requirements.txt` - Python dependencies
- `Dockerfile.public` - Dockerfile for ECS Fargate deployment
- `Dockerfile.lambda` - Dockerfile for Lambda deployment with RIC

## Quick Start

### Test locally

```bash
pip install -r requirements.txt
python main.py
```

### Build containers

```bash
# Public ECR approach
docker build -f Dockerfile.public -t fastapi-public .

# Lambda RIC approach
docker build -f Dockerfile.lambda -t fastapi-lambda .
```

### Test containers

```bash
# Test Fargate container
docker run -p 8000:8000 fastapi-public

# Test Lambda container (requires Lambda Runtime Interface Emulator)
docker run -p 9000:8080 fastapi-lambda
```

See the main workshop guide at `docs/fastapi-containerization-workshop.md` for full instructions.

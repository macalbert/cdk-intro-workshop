# FastAPI Containerization Workshop - Quick Reference

## 🎯 Workshop Goal

Learn to deploy FastAPI using two different containerization approaches:

1. **Public ECR + ECS Fargate** (Traditional container deployment)
2. **Custom Image + Lambda RIC** (Serverless container deployment)

## 📁 Workshop Structure

```text
workshop/src/apps/FastApiApp/
├── main.py                  # FastAPI application
├── lambda_handler.py        # Lambda-specific handler
├── requirements.txt         # Python dependencies
├── Dockerfile.public        # For ECS Fargate deployment
├── Dockerfile.lambda        # For Lambda deployment
└── README.md               # Quick reference

docs/
└── fastapi-containerization-workshop.md  # Complete workshop guide
```

## ⚡ Key Differences

| Aspect | Public ECR (Fargate) | Custom RIC (Lambda) |
|--------|----------------------|---------------------|
| **Base Image** | `python:3.9-slim` | `public.ecr.aws/lambda/python:3.9` |
| **Runtime** | uvicorn server | Mangum ASGI adapter |
| **Scaling** | ECS Auto Scaling | Automatic (serverless) |
| **Cold Start** | ~10-30 seconds | ~2-5 seconds |
| **Cost Model** | Always running | Pay per request |
| **Best For** | Long-running, consistent traffic | Event-driven, sporadic traffic |

## 🚀 Quick Commands

### Local Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python main.py
# Test: curl http://localhost:8000/health
```

### Container Testing

```bash
# Build Fargate container
docker build -f Dockerfile.public -t fastapi-public .
docker run -p 8000:8000 fastapi-public

# Build Lambda container
docker build -f Dockerfile.lambda -t fastapi-lambda .
docker run -p 9000:8080 fastapi-lambda
```

### AWS Deployment

```bash
# Deploy to Fargate
cdk deploy *FastApiPublic*

# Deploy to Lambda
cdk deploy *FastApiLambda* *FastApiGateway*
```

## 🎓 Workshop Flow

1. **Setup** (10 min) - Create FastAPI app and understand approaches
2. **Approach 1** (20 min) - Deploy with public ECR + Fargate
3. **Approach 2** (20 min) - Deploy with custom RIC + Lambda
4. **Compare** (10 min) - Analyze performance, cost, and use cases

## 📊 Decision Framework

**Choose Public ECR + Fargate when:**

- You have consistent traffic patterns
- Need long-running processes
- Require custom runtime environments
- Need WebSocket connections
- Memory requirements > 10GB

**Choose Custom RIC + Lambda when:**

- You have sporadic/unpredictable traffic
- Cost optimization is priority for low traffic
- Event-driven architecture
- Want automatic scaling to zero
- Serverless-first approach

## 🔗 References

- [Complete Workshop Guide](./fastapi-containerization-workshop.md)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [AWS Lambda Container Images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [Mangum (ASGI adapter for Lambda)](https://mangum.io/)
- [AWS CDK Python Reference](https://docs.aws.amazon.com/cdk/api/v2/python/)

---

**⏰ Duration:** 1 hour | **👥 Audience:** Developers, DevOps, Solutions Architects

# 🚀 Practical Workshop: FastAPI Deployment - Public ECR vs Custom with RIC

## 🎯 Workshop Objectives

By the end of this 1-hour workshop, participants will:

- Understand the differences between public ECR images and custom images with Lambda Runtime Interface Client (RIC)
- Deploy a FastAPI application using two different containerization approaches
- Compare performance, cost, and maintenance aspects of each approach
- Learn practical deployment strategies using AWS CDK

## ⏱️ Workshop Timeline (60 minutes)

### 1. Introduction & Setup (10 minutes)

- Quick overview of FastAPI and containerization strategies
- Understanding Lambda Runtime Interface Client (RIC)
- Project setup and prerequisites check

### 2. Approach 1: Public ECR Image (20 minutes)

- Create FastAPI application with public base image
- Deploy using ECS Fargate
- Test and analyze the deployment

### 3. Approach 2: Custom Image with RIC (20 minutes)

- Modify FastAPI for Lambda compatibility with RIC
- Deploy using Lambda + API Gateway
- Test and compare with Approach 1

### 4. Comparison & Best Practices (10 minutes)

- Performance analysis
- Cost considerations
- When to use each approach
- Q&A and wrap-up

---

## 📋 Prerequisites

- AWS CLI configured with proper credentials
- AWS CDK installed (`npm install -g aws-cdk`)
- Docker installed and running
- Python 3.9+ installed
- Access to this workshop repository

## 🛠️ Project Setup

### Step 1: Create FastAPI Application Structure

First, let's create our FastAPI application:

```bash
# Navigate to the workshop directory
cd workshop/src/apps/

# Create FastAPI application directory
mkdir FastApiApp
cd FastApiApp
```

Create the application files:

**requirements.txt:**

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
mangum==0.17.0
```

**main.py:**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

app = FastAPI(
    title="CDK Workshop FastAPI",
    description="Demo API for CDK Workshop",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello from FastAPI!", "deployment": "workshop"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "fastapi-workshop"}

@app.get("/info")
async def get_info():
    return {
        "runtime": "FastAPI",
        "python_version": "3.9+",
        "deployment_type": os.getenv("DEPLOYMENT_TYPE", "unknown"),
        "container_info": {
            "image_type": os.getenv("IMAGE_TYPE", "custom"),
            "runtime_interface": os.getenv("RUNTIME_INTERFACE", "direct")
        }
    }

@app.post("/echo")
async def echo_data(data: dict):
    return {"echoed": data, "received_at": "fastapi-endpoint"}

# For local development
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 🐳 Approach 1: Public ECR Image Deployment

### Step 1: Create Dockerfile for ECS Fargate

Create a standard Dockerfile using a public FastAPI base image:

**Dockerfile.public:**

```dockerfile
# Using public Python slim image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONPATH=/app
ENV DEPLOYMENT_TYPE=fargate
ENV IMAGE_TYPE=public
ENV RUNTIME_INTERFACE=direct

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY main.py .

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Step 2: Create CDK Stack for Fargate Deployment

Create a new CDK configuration in `workshop/src/iac/lib/config/env/fastapiPublic.ts`:

```typescript
import { SubnetType } from "aws-cdk-lib/aws-ec2";
import { StackBuildPart, type StackBuildPartProps } from "@m47/shared-iac";
import { FargateStack, type FargateStackProps } from "@m47/shared-iac";
import { AppEnvironment } from "@m47/shared-iac";

export interface FastApiPublicProps extends StackBuildPartProps {
    absoluteRepoPath: string;
    dockerfileApi: string;
    subdomain: string;
    exposedPort: number;
}

export class FastApiPublic extends StackBuildPart {
    constructor(private props: FastApiPublicProps) {
        super(props);
    }

    build() {
        const fargateStack = this.createFargateStack();
        return [fargateStack];
    }

    private createFargateStack(): FargateStack {
        const fargateProps: FargateStackProps = {
            name: "FastApiPublic",
            githubRepo: this.props.githubRepo,
            env: this.props.env,
            vpc: this.props.vpc,
            envName: AppEnvironment.Production,
            stackName: `${this.props.githubRepo}-FastApiPublic`,
            directoryDockerfile: this.props.absoluteRepoPath,
            filenameDockerfile: this.props.dockerfileApi,
            serviceName: "fastapi-public",
            containerTcpPort: this.props.exposedPort,
            cpu: 256,
            memoryLimitMiB: 512,
            minCapacity: 1,
            maxCapacity: 3,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
        };

        return new FargateStack(this.props.scope, fargateProps);
    }
}
```

### Step 3: Deploy Public ECR Approach

```bash
# Build and test locally first
cd workshop/src/apps/FastApiApp/
docker build -f Dockerfile.public -t fastapi-public .
docker run -p 8000:8000 fastapi-public

# Test locally
curl http://localhost:8000/health
```

Deploy to AWS:

```bash
cd ../../iac/
cdk deploy *FastApiPublic*
```

---

## ⚡ Approach 2: Custom Image with Lambda RIC

### Step 1: Create Lambda-Compatible Version

**lambda_handler.py:**

```python
from mangum import Mangum
from main import app
import os

# Set Lambda-specific environment variables
os.environ["DEPLOYMENT_TYPE"] = "lambda"
os.environ["IMAGE_TYPE"] = "custom"
os.environ["RUNTIME_INTERFACE"] = "ric"

# Create Lambda handler using Mangum adapter
handler = Mangum(app, lifespan="off")

def lambda_handler(event, context):
    return handler(event, context)
```

### Step 2: Create Lambda-Optimized Dockerfile

**Dockerfile.lambda:**

```dockerfile
# Use AWS Lambda Python base image with RIC
FROM public.ecr.aws/lambda/python:3.9

# Set environment variables for Lambda
ENV DEPLOYMENT_TYPE=lambda
ENV IMAGE_TYPE=custom
ENV RUNTIME_INTERFACE=ric

# Copy requirements and install dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY main.py ${LAMBDA_TASK_ROOT}
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler
CMD ["lambda_handler.lambda_handler"]
```

### Step 3: Create CDK Stack for Lambda Deployment

Create `workshop/src/iac/lib/config/env/fastapiLambda.ts`:

```typescript
import { Duration } from "aws-cdk-lib";
import { SubnetType } from "aws-cdk-lib/aws-ec2";
import { StackBuildPart, type StackBuildPartProps } from "@m47/shared-iac";
import { ApiLambdaStack, type ApiLambdaStackProps } from "@m47/shared-iac";
import { ApiGatewayStack, type ApiGatewayStackProps } from "@m47/shared-iac";
import { AppEnvironment } from "@m47/shared-iac";
import { formatRepoNameForCloudFormation } from "@m47/shared-iac/src/utils/cloudFormationUtils";

export interface FastApiLambdaProps extends StackBuildPartProps {
    absoluteRepoPath: string;
    dockerfileApi: string;
    subdomain: string;
}

export class FastApiLambda extends StackBuildPart {
    constructor(private props: FastApiLambdaProps) {
        super(props);
    }

    build() {
        const lambdaStack = this.createApiLambdaStack();
        const apiGatewayStack = this.createApiGateway(lambdaStack.lambdaFunction);
        return [lambdaStack, apiGatewayStack];
    }

    private createApiLambdaStack(): ApiLambdaStack {
        const lambdaProps: ApiLambdaStackProps = {
            name: "FastApiLambda",
            githubRepo: this.props.githubRepo,
            pathDockerFile: this.props.absoluteRepoPath,
            env: this.props.env,
            vpc: this.props.vpc,
            envName: AppEnvironment.Production,
            timeoutSeconds: 30,
            memorySizeMbs: 1024,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            stackName: `${this.props.githubRepo}-FastApiLambda`,
            functionName: `${this.props.githubRepo}-fastapi-lambda`.toLowerCase(),
            dockerFile: this.props.dockerfileApi,
        };

        return new ApiLambdaStack(this.props.scope, lambdaProps);
    }

    private createApiGateway(lambdaFunction: any): ApiGatewayStack {
        const apiProps: ApiGatewayStackProps = {
            env: this.props.env,
            name: "FastApiGateway",
            envName: AppEnvironment.Production,
            lambdaFunction: lambdaFunction,
            stackName: `${this.props.githubRepo}-FastApiGateway`,
            subdomain: this.props.subdomain,
            githubRepo: this.props.githubRepo,
            certificateArn: `arn:aws:acm:us-east-1:${this.props.env.account}:certificate/YOUR_CERT_ID`,
            domain: "your-domain.com", // Replace with your domain
        };

        return new ApiGatewayStack(this.props.scope, apiProps);
    }
}
```

### Step 4: Deploy Lambda RIC Approach

```bash
# Test locally with Lambda runtime emulator
cd workshop/src/apps/FastApiApp/
docker build -f Dockerfile.lambda -t fastapi-lambda .

# Test with Lambda RIC locally
docker run -p 9000:8080 fastapi-lambda

# Test Lambda function locally
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
  -d '{"httpMethod":"GET","path":"/health","headers":{}}'
```

Deploy to AWS:

```bash
cd ../../iac/
cdk deploy *FastApiLambda* *FastApiGateway*
```

---

## 📊 Performance & Cost Comparison

### Key Metrics to Evaluate

| Aspect | Public ECR (Fargate) | Custom RIC (Lambda) |
|--------|----------------------|---------------------|
| **Cold Start** | ~10-30 seconds | ~2-5 seconds |
| **Warm Performance** | Consistent | Consistent |
| **Scaling** | Manual/Auto-scaling | Automatic (0-15min) |
| **Cost (Low Traffic)** | Higher (always running) | Lower (pay per request) |
| **Cost (High Traffic)** | Lower (predictable) | Higher (per invocation) |
| **Maintenance** | Container updates | Managed runtime |
| **Timeout Limits** | No limit | 15 minutes max |
| **Memory Limits** | 30GB max | 10GB max |

### Test Commands

**Test Fargate Deployment:**

```bash
# Get the load balancer URL from CDK output
curl https://your-fargate-lb-url/health
curl https://your-fargate-lb-url/info
```

**Test Lambda Deployment:**

```bash
# Get the API Gateway URL from CDK output
curl https://your-api-gateway-url/health
curl https://your-api-gateway-url/info
```

---

## 🎯 Best Practices & Recommendations

### When to Use Public ECR + Fargate

- ✅ Long-running processes
- ✅ Consistent traffic patterns
- ✅ Need for custom runtime environments
- ✅ WebSocket connections
- ✅ Large memory requirements (>10GB)

### When to Use Custom RIC + Lambda

- ✅ Event-driven architectures
- ✅ Sporadic or unpredictable traffic
- ✅ Need for automatic scaling to zero
- ✅ Cost optimization for low-traffic APIs
- ✅ Serverless-first architecture

### Security Considerations

1. **Image Scanning**: Enable vulnerability scanning for both approaches
2. **Least Privilege**: Use minimal IAM permissions
3. **Environment Variables**: Secure sensitive data with AWS Secrets Manager
4. **Network Security**: Use VPC endpoints and security groups appropriately

---

## 🧹 Cleanup

To avoid ongoing costs, clean up the resources:

```bash
# Destroy Lambda stacks
cdk destroy *FastApiGateway*
cdk destroy *FastApiLambda*

# Destroy Fargate stacks
cdk destroy *FastApiPublic*
```

---

## 🎓 Workshop Exercises

### Exercise 1: Performance Testing

1. Deploy both approaches
2. Use Apache Bench or similar tool to test response times
3. Compare cold start vs warm performance

### Exercise 2: Cost Analysis

1. Enable AWS Cost Explorer
2. Compare costs after 24 hours of light traffic
3. Project costs for different traffic patterns

### Exercise 3: Monitoring Setup

1. Set up CloudWatch dashboards for both deployments
2. Create alarms for error rates and latency
3. Compare observability features

### Exercise 4: Advanced Features

1. Add environment-specific configurations
2. Implement health checks and readiness probes
3. Set up CI/CD pipelines for both approaches

---

## 🔗 Additional Resources

- [AWS Lambda Container Images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [FastAPI with AWS Lambda](https://mangum.io/)
- [AWS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [CDK Patterns](https://cdkpatterns.com/)

---

## 🤔 Discussion Questions

1. What factors would influence your choice between these approaches in a production environment?
2. How would you handle database connections differently in each approach?
3. What monitoring and logging strategies work best for each deployment method?
4. How would you implement CI/CD pipelines for both approaches?

---

**🎉 Congratulations!** You've successfully deployed FastAPI using two different containerization strategies and learned when to use each approach in real-world scenarios.

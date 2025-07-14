# Hands-On: Deploying an API with Lambda and API Gateway

This guide provides step-by-step instructions for deploying an API using AWS Lambda with API Gateway through CDK custom constructs.

## Prerequisites

- AWS CLI configured with proper credentials
- AWS CDK installed (`npm install -g aws-cdk`)
- Docker installed and running
- .NET 7.0 SDK installed
- Access to the workshop repository

## Deployment Steps

### Step 1: Clone and Navigate to the Repository

```bash
# Navigate to the workshop folder
cd workshop/src/iac
```

### Step 2: Inspect the Code Structure

First, let's understand our project structure:

- **API Implementation**: Located in `workshop/src/apps/Minimal.Api/`
- **CDK Infrastructure**: Located in `workshop/src/iac/`

### Step 3: Build the Docker Image Locally (Optional)

This step validates your Docker build works correctly:

```bash
cd ../apps/Minimal.Api/
docker build -t minimal-api .
```

### Step 4: Configure the CDK Stack

Review the `productionBackend.ts` file which contains our stack definitions.

Key sections:

```typescript
// Creating the Lambda stack
const apiLambdaStack = this.createApiLambdaStack(
    "ApiLambda",
    this.props.dockerfileApi,
    "api",
);

// Creating the API Gateway stack
const apiGatewayStack = this.createApiGateway(
    apiLambdaStack.lambdaFunction,
    "ApiGateway",
    "api-cdk-workshop",
);
```

### Step 5: Bootstrap CDK (If Not Already Done)

```bash
cd ../../iac
cdk bootstrap
```

### Step 6: Synthesize the CloudFormation Template

```bash
cdk synth
```

This command generates CloudFormation templates without deploying. Review the output in the `cdk.out` directory.

### Step 7: Deploy the Lambda Function

```bash
cdk deploy m47-cdk-intro-workshop-apilambda-production-stack
```

This will:

1. Build your Docker image
2. Push it to Amazon ECR
3. Create the Lambda function with your container
4. Configure IAM permissions
5. Set up networking in your VPC

### Step 8: Deploy the API Gateway

```bash
cdk deploy m47-cdk-intro-workshop-apigateway-production-stack
```

This will:

1. Create an API Gateway REST API
2. Connect it to your Lambda function
3. Configure CORS settings
4. Set up a custom domain name
5. Create Route53 DNS records

### Step 9: Test the API

```bash
# Note the API endpoint from the CloudFormation outputs
curl -v https://api-cdk-workshop.m47.io/health

# Test the Hello endpoint
curl -v https://api-cdk-workshop.m47.io/hello
```

### Step 10: Monitoring and Logs

1. Open the AWS Management Console
2. Navigate to CloudWatch > Log Groups
3. Find the log group for your Lambda function:
   - `/aws/lambda/m47-cdk-intro-workshop-api-production`
4. Examine logs for any issues or to see request handling

## Implementing Changes

After making changes to your API (e.g., adding new endpoints):

1. Build and test locally (optional)
2. Redeploy only the Lambda stack:

   ```bash
   cdk deploy m47-cdk-intro-workshop-apilambda-production-stack
   ```

## Clean-up (Optional)

To avoid incurring costs, you can destroy the resources:

```bash
cdk destroy m47-cdk-intro-workshop-apigateway-production-stack
cdk destroy m47-cdk-intro-workshop-apilambda-production-stack
```

## Understanding the Deployed Architecture

Your deployment creates:

1. **ECR Repository**: Stores your Docker image
2. **Lambda Function**: Runs your containerized API
3. **API Gateway**: Provides HTTP endpoints for your Lambda
4. **CloudWatch Logs**: Stores execution logs
5. **IAM Roles**: Grants necessary permissions
6. **Route53 Records**: Maps your domain to API Gateway

## Extending the API

Follow these steps to add new endpoints:

1. Add a new endpoint file in the `Endpoints` folder
2. Register the endpoint in `Startup.cs`
3. Build and redeploy the Lambda function

## Workshop Exercises

1. Add the Weather endpoint from the exercise guide
2. Deploy the updated Lambda function
3. Test the new endpoint using curl
4. Check CloudWatch logs to verify requests are being processed correctly

# Practical Workshop: Deploy a Serverless API with API Gateway and Lambda using CDK

## 🎯 Workshop Objectives

By the end of this workshop, participants will:

- Understand how to implement a Lambda-based API using custom CDK constructs
- Deploy a real working serverless API to AWS
- Configure API Gateway to expose the Lambda function
- Test the deployed API endpoint

## ⏱️ Workshop Timeline (60 minutes)

### 1. Introduction & Setup (10 minutes)

- Workshop overview
- Review what we learned about Lambda Runtime Interface Client (RIC) in the previous session
- Understanding our project structure

### 2. Understanding Our CDK Constructs (15 minutes)

- Explore the `ApiLambdaStack` custom construct
- Explore the `ApiGatewayStack` custom construct
- Understanding how they work together
- Code walkthrough

### 3. Hands-On Implementation (25 minutes)

- Implementing a simple API endpoint in our Lambda function
- Configuring and deploying the API Lambda stack
- Integrating with API Gateway
- Deploying the combined stack

### 4. Testing & Exploration (10 minutes)

- Testing the deployed API endpoint
- Exploring CloudWatch logs
- Troubleshooting common issues

## 💻 Hands-On Practice

### Step 1: Understand the Minimal API Implementation

Let's examine our existing .NET Minimal API implementation:

```csharp
// Key API endpoints we'll expose
public static class ApiEndpoints
{
    public const string Health = "/health";
    public const string HelloWorld = "/hello";
}
```

### Step 2: Define the AWS Lambda & API Gateway Stacks

We'll use our custom CDK constructs to define the Lambda function and API Gateway:

```typescript
// 1. Create the API Lambda Stack
const apiLambdaStack = this.createApiLambdaStack(
  "ApiLambda",
  this.props.dockerfileApi,
  "api",
);

// 2. Create the API Gateway Stack and connect it to the Lambda
const apiGatewayStack = this.createApiGateway(
  apiLambdaStack.lambdaFunction,
  "ApiGateway",
  "api-cdk-workshop",
);
```

### Step 3: Configure Our Lambda with Docker

Review the Dockerfile that packages our API:

```Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src
COPY ["Minimal.Api.csproj", "."]
RUN dotnet restore "Minimal.Api.csproj"
COPY . .
RUN dotnet build "Minimal.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Minimal.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Minimal.Api.dll"]
```

### Step 4: Deploy and Test the API

```bash
# Deploy the stacks
cdk deploy m47-cdk-intro-workshop-apilambda-production-stack
cdk deploy m47-cdk-intro-workshop-apigateway-production-stack

# Test the deployed API
curl -v https://api-cdk-workshop.m47.io/hello
```

## 🔍 What We'll Learn

- How AWS CDK constructs can be extended for reusable infrastructure patterns
- How Lambda and API Gateway work together in a serverless architecture
- Best practices for organizing CDK code
- Troubleshooting deployment issues

## 📝 Workshop Exercises

1. Add a new API endpoint to the Lambda function
2. Deploy the updated API using CDK
3. Test the new endpoint to confirm successful deployment
4. Explore CloudWatch logs to verify execution

## 📚 Additional Resources

- [AWS Lambda with API Gateway](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html)
- [CDK API Gateway Constructs](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway-readme.html)
- [Best Practices for Serverless Applications](https://aws.amazon.com/blogs/compute/best-practices-for-organizing-larger-serverless-applications/)

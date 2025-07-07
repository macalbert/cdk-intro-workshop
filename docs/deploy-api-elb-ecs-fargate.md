# Deploy API with ELB and ECS Fargate

## **Overview**

This guide explains how to deploy an API using AWS Elastic Load Balancer (ELB) and ECS Fargate. This setup is ideal for containerized applications requiring high availability and scalability.

## **Using the Custom FargateStack**

To deploy an API with ELB and ECS Fargate using the custom `FargateStack`, follow these steps:

### **Steps**

1. **Define the FargateStack Properties**

   Specify the required properties such as `vpc`, `serviceName`, `directoryDockerfile`, and `filenameDockerfile`.

   **Example:**

   ```typescript
   const fargateStackProps: FargateStackProps = {
       vpc: myVpc,
       serviceName: "MyService",
       directoryDockerfile: "./docker",
       filenameDockerfile: "Dockerfile",
       clusterName: "MyCluster",
       maxCapacity: 5,
       containerTcpPort: 80,
   };
   ```

2. **Create the FargateStack**

   Use the `FargateStack` construct to create the stack.

   **Example:**

   ```typescript
   new FargateStack(app, fargateStackProps);
   ```

3. **Deploy the Stack**

   Use the AWS CDK CLI to deploy the stack.

   **Command:**

   ```bash
   cdk deploy
   ```

### **References**

- [Custom FargateStack Implementation](../shared/src/iac/src/aws/compute/ecs/fargateStack.ts)
- [AWS ECS Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html)
- [AWS ELB Documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html)

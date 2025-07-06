import { App, Stack } from "aws-cdk-lib";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import type { Construct } from "constructs";
import {
    ApiLambdaStack,
    type ApiLambdaStackProps,
} from "../../../../src/aws/compute/lambda/apiLambdaStack";
import { AppEnvironment } from "../../../../src/config/env/appEnvironment";
import { normalizeDockerImageReferences } from "../../../utils/templateNormalizer";

describe("ApiLambdaStack", () => {
    function createApiLambdaStackProps(app: Construct): ApiLambdaStackProps {
        return {
            name: "lambda",
            pathDockerFile: "./test/aws/compute/lambda",
            dockerFile: "Dockerfile",
            vpc: new Vpc(app, "vpc"),
            functionName: "test-function",
            timeoutSeconds: 300,
            memorySizeMbs: 128,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            githubRepo: "test",
            envName: AppEnvironment.Test,
            stackName: "modelhub",
        };
    }    
    
    test("Should_MatchSnapshot_When_ApiLambdaStackIsCreated", () => {
        // Arrange
        const app = new Stack(new App(), "ApiLambdaStackTest");
        const props = createApiLambdaStackProps(app);
        
        // Act
        const actual = new ApiLambdaStack(app, props);
        
        // Assert
        expect(actual.lambdaFunction).toBeDefined();
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot("ApiLambdaStackTest");
    });

    test("Should_MatchSnapshot_When_ApiLambdaStackWithReservedConcurrencyIsCreated", () => {
        // Arrange
        const app = new Stack(
            new App(),
            "ApiLambdaStackWithReservedConcurrency",
        );
        const props = createApiLambdaStackProps(app);
        props.reservedConcurrentExecutions = 5;
        
        // Act
        const actual = new ApiLambdaStack(app, props);
        
        // Assert
        expect(actual.lambdaFunction).toBeDefined();
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot(
            "ApiLambdaStackWithReservedConcurrencyTest",
        );
    });

    test("Should_MatchSnapshot_When_SecurityGroupRulesAreCreated", () => {
        // Arrange
        const app = new Stack(new App(), "ApiLambdaStackSecurityGroupTest");
        const props = createApiLambdaStackProps(app);
        
        // Act
        const actual = new ApiLambdaStack(app, props);
        
        // Assert
        expect(actual.lambdaFunction).toBeDefined();
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot(
            "ApiLambdaStackSecurityGroupTest",
        );
    });

    test("Should_MatchSnapshot_When_SqsQueueIsConnectedToApiLambda", () => {
        // Arrange
        const app = new Stack(new App(), "ApiLambdaStackWithSqs");
        const props = createApiLambdaStackProps(app);
        props.arnQueueTrigger = "arn:aws:sqs:us-east-1:123456789012:test-queue";
        
        // Act
        const actual = new ApiLambdaStack(app, props);
        
        // Assert
        expect(actual.lambdaFunction).toBeDefined();
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot("ApiLambdaStackWithSqsTest");
    });

    test("Should_MatchSnapshot_When_RoleWithPoliciesIsCreated", () => {
        // Arrange
        const app = new Stack(new App(), "ApiLambdaStackRolePolicyTest");
        const props = createApiLambdaStackProps(app);
        
        // Act
        const actual = new ApiLambdaStack(app, props);
        
        // Assert
        expect(actual.lambdaFunction).toBeDefined();
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot(
            "ApiLambdaStackRolePolicyTest",
        );
    });

    test("Should_MatchSnapshot_When_ApiLambdaWithCustomEnvVarsIsCreated", () => {
        // Arrange
        const app = new Stack(new App(), "ApiLambdaStackWithEnvVarsTest");
        const props = createApiLambdaStackProps(app);
        props.lambdaEnvVariables = {
            API_KEY: "api-key-value",
            REGION: "us-east-1",
            LOG_LEVEL: "INFO",
        };

        // Act
        const actual = new ApiLambdaStack(app, props); 
          
        // Assert
        expect(actual.lambdaFunction).toBeDefined();
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot(
            "ApiLambdaStackWithEnvVarsTest",
        );
    });

    test("Should_MatchSnapshot_When_ApiLambdaCombinesAllOptions", () => {
        // Arrange
        const app = new Stack(new App(), "ApiLambdaStackCompleteTest");
        const props = createApiLambdaStackProps(app);
        props.arnQueueTrigger = "arn:aws:sqs:us-east-1:123456789012:test-queue";
        props.reservedConcurrentExecutions = 3;

        // Act
        const actual = new ApiLambdaStack(app, props); 
          
        // Assert
        expect(actual.lambdaFunction).toBeDefined();
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot(
            "ApiLambdaStackCompleteTest",
        );
    });
});

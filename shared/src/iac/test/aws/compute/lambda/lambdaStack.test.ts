import { App, Stack } from "aws-cdk-lib";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import type { Construct } from "constructs";
import {
    LambdaStack,
    type LambdaStackProps,
} from "../../../../src/aws/compute/lambda/lambdaStack";
import { AppEnvironment } from "../../../../src/config/env/appEnvironment";
import { normalizeDockerImageReferences } from "../../../utils/templateNormalizer";

describe("LambdaStack", () => {
    function createLambdaStackProps(app: Construct): LambdaStackProps {
        return {
            name: "lambda",
            contextBuildPath: "./test/aws/compute/lambda",
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

    test("Should_MatchSnapshot_When_LambdaStackIsCreated", () => {
        // Arrange
        const app = new Stack(new App(), "LambdaStackTest");
        const props = createLambdaStackProps(app);

        // Act
        const actual = new LambdaStack(app, props);

        // Assert
        expect(actual.lambdaFunction).toBeDefined();
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot("LambdaStackTest");
    });

    test("Should_MatchSnapshot_When_LambdaStackWithSqsIsCreated", () => {
        // Arrange
        const app = new Stack(new App(), "LambdaStackWithSqsTest");
        const props = createLambdaStackProps(app);
        props.arnQueueTrigger = "arn:aws:sqs:us-east-1:123456789012:test-queue";

        // Act
        const actual = new LambdaStack(app, props);

        // Assert
        expect(actual.lambdaFunction).toBeDefined();
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot("LambdaStackWithSqsTest");
    });

    test("Should_MatchSnapshot_When_LambdaStackWithEnvVarsIsCreated", () => {
        // Arrange
        const app = new Stack(new App(), "LambdaStackWithEnvVarsTest");
        const props = createLambdaStackProps(app);
        props.lambdaEnvVariables = {
            API_KEY: "test-api-key",
            DEBUG: "true",
            REGION: "us-east-1",
        };

        // Act
        const actual = new LambdaStack(app, props);

        // Assert
        expect(actual.lambdaFunction).toBeDefined();
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot(
            "LambdaStackWithEnvVarsTest",
        );
    });

    test("Should_MatchSnapshot_When_LambdaStackWithReservedConcurrencyIsCreated", () => {
        // Arrange
        const app = new Stack(new App(), "LambdaStackWithConcurrencyTest");
        const props = createLambdaStackProps(app);
        props.reservedConcurrentExecutions = 5;

        // Act
        const actual = new LambdaStack(app, props);

        // Assert
        expect(actual.lambdaFunction).toBeDefined();
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot(
            "LambdaStackWithConcurrencyTest",
        );
    });
});

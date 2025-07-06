import { App, Stack } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
    FargateStack,
    type FargateStackProps,
} from "../../../../src/aws/compute/ecs/fargateStack";
import { AppEnvironment } from "../../../../src/config/env/appEnvironment";
import { normalizeDockerImageReferences } from "../../../utils/templateNormalizer";

describe("FargateStack", () => {
    function createFargateStackProps(scope: Stack): FargateStackProps {
        return {
            vpc: new Vpc(scope, "vpc"),
            cpu: 256,
            memoryLimitMiB: 512,
            serviceName: "MyFargateService",
            directoryDockerfile: "./test/aws/compute/ecs",
            filenameDockerfile: "Dockerfile",
            envName: AppEnvironment.Test,
            name: "MyFargateStack",
            githubRepo: "test",
            stackName: "stackNameTest",
            clusterName: "test-cluster",
        };
    }

    test("Should_CreateFargateServiceWithAutoScaling_When_QueueIsProvided", () => {
        // Arrange
        const stack = new Stack(new App(), "FargateStack");
        const expectedProps = createFargateStackProps(stack);
        expectedProps.queueArn = "arn:aws:sqs:asdf:asdf:my-queue";

        // Act
        const actual = new FargateStack(stack, expectedProps);

        // Assert
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot("FargateStack");
    });

    test("Should_CreateFargateServiceWithoutAutoScaling_When_QueueIsNotProvided", () => {
        // Arrange
        const stack = new Stack(new App(), "FargateStackWithoutAutoScaling");
        const expectedProps = createFargateStackProps(stack);

        // Act
        const actual = new FargateStack(stack, expectedProps);

        // Assert
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot(
            "FargateStackWithoutAutoScaling",
        );
    });

    test("Should_ConfigureContainerWithTelemetrySidecar_When_TelemetryIsEnabled", () => {
        // Arrange
        const stack = new Stack(new App(), "FargateStackWithTelemetry");
        const expectedProps = createFargateStackProps(stack);
        expectedProps.includeTelemetry = true;

        // Act
        const actual = new FargateStack(stack, expectedProps);

        // Assert
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot("FargateStackWithTelemetry");
    });

    test("Should_ConfigureContainerWithPortMapping_When_ContainerPortIsSpecified", () => {
        // Arrange
        const stack = new Stack(new App(), "FargateStackWithPortMapping");
        const expectedProps = createFargateStackProps(stack);
        expectedProps.containerTcpPort = 8080;

        // Act
        const actual = new FargateStack(stack, expectedProps);

        // Assert
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot(
            "FargateStackWithPortMapping",
        );
    });

    test("Should_ConfigureWithLoadBalancerAndHttpsListener_When_LoadBalancerArnAndCertificate", () => {
        // Arrange
        const stack = new Stack(new App(), "FargateStackWithLoadBalancer");
        const expectedProps = createFargateStackProps(stack);
        expectedProps.containerTcpPort = 8080;
        expectedProps.loadBalancerArn =
            "arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/net/my-load-balancer/abcdef123456";
        expectedProps.certificateArn =
            "arn:aws:acm:us-west-2:123456789012:certificate/abcdef123456";
        expectedProps.domain = "example.com";
        expectedProps.subdomain = "api";

        // Act
        const actual = new FargateStack(stack, expectedProps);

        // Assert
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot(
            "FargateStackWithLoadBalancer",
        );
    });

    test("Should_ConfigureStorageBucketAccess_When_BucketIsProvided", () => {
        // Arrange
        const stack = new Stack(new App(), "FargateStackWithBucket");
        const expectedProps = createFargateStackProps(stack);
        const bucket = new Bucket(stack, "TestBucket");
        expectedProps.storageBucket = bucket;

        // Act
        const actual = new FargateStack(stack, expectedProps);

        // Assert
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot("FargateStackWithBucket");
    });

    test("Should_ConfigureCustomMaxCapacity_When_MaxCapacityIsSpecified", () => {
        // Arrange
        const stack = new Stack(new App(), "FargateStackWithCustomCapacity");
        const expectedProps = createFargateStackProps(stack);
        expectedProps.queueArn = "arn:aws:sqs:asdf:asdf:my-queue";
        expectedProps.maxCapacity = 5;

        // Act
        const actual = new FargateStack(stack, expectedProps);

        // Assert
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot(
            "FargateStackWithCustomCapacity",
        );
    });

    test("Should_IncludeRdsSecurityGroup_When_RdsSecurityGroupIdIsSpecified", () => {
        // Arrange
        const stack = new Stack(new App(), "FargateStackWithRdsSg");
        const expectedProps = createFargateStackProps(stack);
        expectedProps.rdsSecurityGroupId = "sg-12345";

        // Act
        const actual = new FargateStack(stack, expectedProps);

        // Assert
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot("FargateStackWithRdsSg");
    });

    test("Should_MatchSnapshot_When_FargateStackIsCreated", () => {
        // Arrange
        const stack = new Stack(new App(), "FargateStackSnapshotTest");
        const expectedProps = createFargateStackProps(stack);

        // Act
        const actual = new FargateStack(stack, expectedProps);

        // Assert
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot("FargateStackSnapshotTest");
    });

    test("Should_MatchSnapshot_When_FargateStackWithQueueAndTelemetryIsCreated", () => {
        // Arrange
        const stack = new Stack(new App(), "FargateStackComplexTest");
        const expectedProps = createFargateStackProps(stack);
        expectedProps.queueArn = "arn:aws:sqs:asdf:asdf:my-queue";
        expectedProps.includeTelemetry = true;
        expectedProps.containerTcpPort = 8080;
        expectedProps.maxCapacity = 5;

        // Act
        const actual = new FargateStack(stack, expectedProps);

        // Assert
        const normalizedTemplate = normalizeDockerImageReferences(actual);
        expect(normalizedTemplate).toMatchSnapshot("FargateStackComplexTest");
    });
});

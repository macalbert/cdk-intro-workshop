import { Duration, RemovalPolicy } from "aws-cdk-lib";
import {
    AccessLogFormat,
    EndpointType,
    LambdaRestApi,
    LogGroupLogDestination,
    Cors,
} from "aws-cdk-lib/aws-apigateway";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { DockerImageCode, DockerImageFunction } from "aws-cdk-lib/aws-lambda";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { ApiGateway } from "aws-cdk-lib/aws-route53-targets";
import {
    type ISecurityGroup,
    type IVpc,
    Peer,
    Port,
    SecurityGroup,
    SubnetType,
} from "aws-cdk-lib/aws-ec2";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";
import { AppEnvironment } from "../../config/env/appEnvironment";
import { type M47StackProps, M47Stack } from "../../config/shared/m47Stack";

/**
 * Properties for configuring the DynamicWebsiteStack.
 *
 * This interface extends the base M47StackProps with additional properties required
 * for deploying a server-side rendered (SSR) application using Lambda and API Gateway.
 */
export interface DynamicWebsiteStackProps extends M47StackProps {
    vpc: IVpc;
    subdomain: string;
    domainName: string;
    certificateArn: string;
    hostedZoneId: string;
    pathDockerFile: string;
    dockerfile: string;
    envName: AppEnvironment;
    memorySize?: number;
    timeoutSeconds?: number;
    environmentVariables?: Record<string, string>;
}

/**
 * DynamicWebsiteStack provisions a Lambda function with API Gateway for deploying
 * a server-side rendered (SSR) application. This stack works with any JavaScript framework
 * that supports SSR (Next.js, Nuxt.js, etc). It includes the necessary Lambda function,
 * API Gateway configuration, custom domain setup, and Route53 DNS records.
 *
 * @example
 * new DynamicWebsiteStack(app, {
 *   vpc: myVpc,
 *   subdomain: "app",
 *   domainName: "example.com",
 *   certificateArn: "arn:aws:acm:us-east-1:123456789012:certificate/my-cert-id",
 *   hostedZoneId: "Z1234567890ABC",
 *   appPath: "./path/to/ssr/app",
 *   envName: AppEnvironment.Production,
 *   memorySize: 1024,
 *   timeoutSeconds: 30,
 *   // additional properties from M47StackProps...
 * });
 */
export class DynamicWebsiteStack extends M47Stack {
    constructor(scope: Construct, props: DynamicWebsiteStackProps) {
        super(scope, props);

        // Import the certificate for custom domain
        const certificate = Certificate.fromCertificateArn(
            this,
            "certificate",
            props.certificateArn,
        );

        // Create a security group for the Lambda function
        const lambdaSecurityGroup = this.createSecurityGroup(props.vpc);

        // Create an IAM role for the Lambda function
        const lambdaRole = this.createRole();

        // Define the full domain name for the API
        const fullDomainName =
            `${props.subdomain}.${props.domainName}`.toLowerCase();

        // Create the Docker image asset from the specified Docker file
        const code = DockerImageCode.fromImageAsset(props.pathDockerFile, {
            file: props.dockerfile,
        });

        // Create the Docker image-based Lambda function for SSR application
        const ssrLambda = new DockerImageFunction(this, "SsrLambdaFunction", {
            vpc: props.vpc,
            vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [lambdaSecurityGroup],
            functionName:
                `${props.subdomain}-ssr-${props.envName}`.toLowerCase(),
            memorySize: props.memorySize ?? 1024,
            timeout: Duration.seconds(props.timeoutSeconds ?? 30),
            code: code,
            environment: {
                NODE_ENV:
                    props.envName === AppEnvironment.Production
                        ? "production"
                        : "development",
                ...(props.environmentVariables ?? {}),
            },
            role: lambdaRole,
        });

        // Create a log group for API Gateway access logs
        const logGroup = new LogGroup(this, "ApiGatewayAccessLogs", {
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.ONE_YEAR,
        });

        // Create the REST API with Lambda integration and custom domain
        const restApi = new LambdaRestApi(
            this,
            `SsrRestApi-${this.stackName}`,
            {
                handler: ssrLambda,
                cloudWatchRole: true,
                defaultCorsPreflightOptions: {
                    allowHeaders: [
                        "Cache-Control",
                        "Content-Language",
                        "Content-Type",
                        "Expires",
                        "Last-Modified",
                        "Pragma",
                        "Authorization",
                        "X-Amz-Date",
                        "X-Api-Key",
                        "X-Forwarded-For"
                    ],
                    allowMethods: Cors.ALL_METHODS,
                    allowCredentials: true,
                    allowOrigins: Cors.ALL_ORIGINS,
                },
                binaryMediaTypes: ["*/*"],
                deployOptions: {
                    accessLogDestination: new LogGroupLogDestination(logGroup),
                    accessLogFormat: AccessLogFormat.clf(),
                },
                domainName: {
                    domainName: fullDomainName,
                    certificate: certificate,
                    endpointType: EndpointType.EDGE,
                },
                proxy: true,
            },
        );

        // Create a Route53 record pointing to the API Gateway
        new ARecord(this, `ARecord-${this.stackName}`, {
            zone: HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
                zoneName: props.domainName,
                hostedZoneId: props.hostedZoneId,
            }),
            recordName: props.subdomain,
            target: RecordTarget.fromAlias(new ApiGateway(restApi)),
        });

        // Add project-specific tags to the Lambda function and API Gateway
        this.addProjectTags(ssrLambda, props);
        this.addProjectTags(restApi, props);
    }

    /**
     * Creates a security group for the Lambda function.
     *
     * The security group allows outbound HTTPS and HTTP traffic, enabling the Lambda function
     * to communicate with external APIs and services.
     *
     * @param vpc The VPC where the security group will be created
     * @returns The created security group
     */
    private createSecurityGroup(vpc: IVpc): ISecurityGroup {
        const lambdaSecurityGroup = new SecurityGroup(
            this,
            `SecurityGroup-${this.stackName}`,
            {
                vpc: vpc,
                allowAllOutbound: false,
                description: `${this.stackName}-SecurityGroup`,
                securityGroupName: `${this.stackName}-SecurityGroup`,
            },
        );

        // Allow outbound HTTPS traffic for external API calls
        lambdaSecurityGroup.addEgressRule(
            Peer.anyIpv4(),
            Port.tcp(443),
            "Allow HTTPS outbound",
        );

        // Allow outbound HTTP traffic
        lambdaSecurityGroup.addEgressRule(
            Peer.anyIpv4(),
            Port.tcp(80),
            "Allow HTTP outbound",
        );

        return lambdaSecurityGroup;
    }

    /**
     * Creates an IAM role for the Lambda function with necessary permissions.
     *
     * The role is granted permissions for CloudWatch Logs and EC2 networking operations
     * required for the function to operate within a VPC.
     *
     * @returns The created IAM role
     */
    private createRole(): Role {
        const role = new Role(this, "LambdaRole", {
            assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
        });

        // Add necessary permissions for Lambda
        role.addToPolicy(
            new PolicyStatement({
                actions: [
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                ],
                resources: ["arn:aws:logs:*:*:*"],
            }),
        );

        // Allow Lambda to create network interfaces in the VPC
        role.addToPolicy(
            new PolicyStatement({
                actions: [
                    "ec2:CreateNetworkInterface",
                    "ec2:DescribeNetworkInterfaces",
                    "ec2:DeleteNetworkInterface",
                ],
                resources: ["*"],
            }),
        );

        return role;
    }
}

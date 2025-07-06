import { Duration } from "aws-cdk-lib";
import {
    type ISecurityGroup,
    type IVpc,
    Peer,
    Port,
    SecurityGroup,
    type SubnetSelection,
} from "aws-cdk-lib/aws-ec2";
import type { Platform } from "aws-cdk-lib/aws-ecr-assets";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import {
    DockerImageCode,
    DockerImageFunction,
    type Function as LambdaFunction,
} from "aws-cdk-lib/aws-lambda";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../../config/shared/m47Stack";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Queue } from "aws-cdk-lib/aws-sqs";

/**
 * Properties for configuring the LambdaStack.
 *
 * This interface extends the base M47StackProps with additional properties required for deploying
 * a Docker-based Lambda function. It includes VPC configuration, Docker build context and file details,
 * subnet selection, optional SQS queue trigger ARN, and other Lambda-specific settings.
 */
export interface LambdaStackProps extends M47StackProps {
    vpc: IVpc;
    functionName: string;
    timeoutSeconds: number;
    memorySizeMbs: number;
    dockerFile: string;
    contextBuildPath: string;
    vpcSubnets: SubnetSelection;
    arnQueueTrigger?: string;
    reservedConcurrentExecutions?: number;
    lambdaEnvVariables?: object;
    roleName?: string;
    platform?: Platform;
}

/**
 * AWS CDK stack for deploying a Docker-based Lambda function.
 *
 * This stack creates a Docker image asset from the specified build context and Docker file,
 * and then deploys a Lambda function using that image. The function is configured with the provided
 * VPC, subnet, security group, and IAM role. Optional environment variables are added to the function.
 *
 * @example
 * const lambdaStack = new LambdaStack(app, {
 *   vpc: myVpc,
 *   functionName: "myLambda",
 *   timeoutSeconds: 30,
 *   memorySizeMbs: 512,
 *   dockerFile: "Dockerfile",
 *   contextBuildPath: "./path/to/context",
 *   vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_NAT },
 *   arnQueueTrigger: "arn:aws:sqs:region:account:queueName", // optional
 *   reservedConcurrentExecutions: 5, // optional
 *   lambdaEnvVariables: { KEY: "value" }, // optional
 *   roleName: "CustomLambdaRole", // optional
 *   platform: Platform.LINUX_AMD64, // optional
 *   // plus additional properties from M47StackProps...
 * });
 */
export class LambdaStack extends M47Stack {
    public lambdaFunction: LambdaFunction;

    /**
     * Constructs a new instance of the LambdaStack.
     *
     * The constructor creates a Docker image asset using the specified build context and Docker file,
     * then deploys a Lambda function using that image. If environment variables are provided, they are added
     * to the Lambda function.
     *
     * @param scope - The scope in which this stack is defined.
     * @param props - The properties for configuring the Lambda function and stack.
     */
    constructor(scope: Construct, props: LambdaStackProps) {
        super(scope, props);

        this.lambdaFunction = new DockerImageFunction(
            this,
            "DockerLambdaFunction",
            {
                vpc: props.vpc,
                vpcSubnets: props.vpcSubnets,
                securityGroups: [this.createSecurityGroup(props.vpc)],
                functionName:
                    `${props.functionName}-${props.envName}`.toLowerCase(),
                memorySize: Number(props.memorySizeMbs),
                code: DockerImageCode.fromImageAsset(props.contextBuildPath, {
                    file: props.dockerFile,
                    platform: props.platform,
                }),
                timeout: Duration.seconds(Number(props.timeoutSeconds)),
                role: this.createRole(props),
                reservedConcurrentExecutions:
                    props.reservedConcurrentExecutions,
            },
        );

        if (props.arnQueueTrigger) {
            const queue = Queue.fromQueueArn(
                this,
                `Queue-${this.getStackId()}`,
                props.arnQueueTrigger,
            );
            const sqsEventSource = new SqsEventSource(queue, {
                batchSize: 1,
            });
            this.lambdaFunction.addEventSource(sqsEventSource);
        }

        this.addProjectTags(this.lambdaFunction, props);

        if (props.lambdaEnvVariables) {
            for (const [key, value] of Object.entries(
                props.lambdaEnvVariables,
            )) {
                this.lambdaFunction.addEnvironment(key, value);
            }
        }
    }

    /**
     * Creates a security group for the Lambda function.
     *
     * The created security group allows outbound HTTPS and HTTP traffic, and permits PostgreSQL traffic (port 5432)
     * to the VPC. This enables the Lambda function to communicate with external services and internal databases.
     *
     * @param vpc - The VPC where the Lambda function will be deployed.
     * @returns A security group configured for Lambda function communication.
     */
    private createSecurityGroup(vpc: IVpc): ISecurityGroup {
        const tcp5432 = Port.tcpRange(5432, 5432);

        const lambdaSecurityGroup = new SecurityGroup(
            this,
            `SecurityGroup-${this.getStackId()}`,
            {
                vpc: vpc,
                allowAllOutbound: false,
                description: `${this.getStackId()}-${SecurityGroup.name}`,
                securityGroupName: `${this.getStackId()}-${SecurityGroup.name}`,
            },
        );

        lambdaSecurityGroup.addEgressRule(
            Peer.anyIpv4(),
            Port.tcp(443),
            "Allow HTTPS outbound",
        );

        lambdaSecurityGroup.addEgressRule(
            Peer.anyIpv4(),
            Port.tcp(80),
            "Allow HTTP outbound",
        );

        lambdaSecurityGroup.addEgressRule(
            Peer.anyIpv4(),
            tcp5432,
            "Allow PostgreSQL outbound to RDS",
        );

        return lambdaSecurityGroup;
    }

    /**
     * Creates an IAM role for the Lambda function.
     *
     * The role is granted permissions for various AWS services such as DynamoDB, RDS, EC2, CloudWatch,
     * SQS, SNS, and others required for the function's operation. It also allows the role to be passed
     * to Lambda.
     *
     * @param props - The Lambda stack properties.
     * @returns The created IAM role.
     */
    private createRole(props: LambdaStackProps) {
        const role = new Role(this, "LambdaRole", {
            roleName:
                props.roleName ??
                `${props.functionName}-${props.name}-LambdaRole-${props.envName}`,
            assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
        });

        role.addToPolicy(
            new PolicyStatement({
                actions: [
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:GetItem",
                    "dynamodb:BatchGetItem",
                    "dynamodb:BatchWriteItem",
                    "dynamodb:Query",
                    "dynamodb:Scan",
                    "lambda:InvokeFunction",
                    "lambda:InvokeAsync",
                    "rds-data:*",
                    "ec2:CreateNetworkInterface",
                    "ec2:DescribeNetworkInterfaces",
                    "ec2:DeleteNetworkInterface",
                    "logs:CreateLogGroup",
                    "logs:DescribeLogGroups",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                    "ds:CreateComputer",
                    "ds:DescribeDirectories",
                    "ssm:GetParameter",
                    "ssm:GetParameters",
                    "ssm:GetParameterHistory",
                    "ssm:GetParametersByPath",
                    "sqs:ReceiveMessage",
                    "sqs:DeleteMessage",
                    "sqs:SendMessage",
                    "sqs:GetQueueAttributes",
                    "sqs:GetQueueUrl",
                    "sns:Publish",
                    "cloudformation:DescribeStacks",
                    "cloudformation:ListStackResources",
                    "cloudwatch:ListMetrics",
                    "cloudwatch:GetMetricData",
                    "ec2:DescribeSecurityGroups",
                    "ec2:DescribeSubnets",
                    "ec2:DescribeVpcs",
                    "kms:ListAliases",
                    "iam:GetPolicy",
                    "iam:GetPolicyVersion",
                    "iam:GetRole",
                    "iam:GetRolePolicy",
                    "iam:ListAttachedRolePolicies",
                    "iam:ListRolePolicies",
                    "iam:ListRoles",
                    "lambda:*",
                    "states:DescribeStateMachine",
                    "states:ListStateMachines",
                    "tag:GetResources",
                    "xray:GetTraceSummaries",
                    "xray:BatchGetTraces",
                ],
                resources: ["*"],
            }),
        );

        role.addToPolicy(
            new PolicyStatement({
                actions: ["iam:PassRole"],
                resources: ["*"],
                conditions: {
                    StringEquals: {
                        "iam:PassedToService": "lambda.amazonaws.com",
                    },
                },
            }),
        );

        role.addToPolicy(
            new PolicyStatement({
                actions: [
                    "logs:DescribeLogStreams",
                    "logs:GetLogEvents",
                    "logs:FilterLogEvents",
                ],
                resources: ["arn:aws:logs:*:*:log-group:/aws/lambda/*"],
            }),
        );

        role.addToPolicy(
            new PolicyStatement({
                actions: [
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:DescribeSecret",
                    "secretsmanager:TagResource",
                ],
                resources: [
                    "arn:aws:secretsmanager:*:*:secret:rds-db-credentials/*",
                ],
            }),
        );

        role.addToPolicy(
            new PolicyStatement({
                actions: ["s3:*", "s3-object-lambda:*"],
                resources: ["*"],
            }),
        );

        return role;
    }
}

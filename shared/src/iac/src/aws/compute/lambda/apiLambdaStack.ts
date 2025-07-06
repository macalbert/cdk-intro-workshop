import { Duration, type aws_lambda as Lambda } from "aws-cdk-lib";
import {
    type ISecurityGroup,
    type IVpc,
    Peer,
    Port,
    SecurityGroup,
    type SubnetSelection,
} from "aws-cdk-lib/aws-ec2";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import {
    DockerImageCode,
    DockerImageFunction,
    type DockerImageFunctionProps,
} from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Queue } from "aws-cdk-lib/aws-sqs";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../../config/shared/m47Stack";
import { LEGACY_VPC_CIDR } from "../../network/vpcConstants";

/**
 * Properties for configuring the ApiLambdaStack.
 *
 * This interface extends the base M47StackProps with additional properties required for deploying
 * a Docker-based Lambda function. It includes VPC configuration, Docker file paths, memory and timeout settings,
 * subnet selection, and an optional ARN for an SQS queue trigger.
 */
export interface ApiLambdaStackProps extends M47StackProps {
    vpc: IVpc;
    functionName: string;
    timeoutSeconds: number;
    memorySizeMbs: number;
    pathDockerFile: string;
    dockerFile: string;
    vpcSubnets: SubnetSelection;
    arnQueueTrigger?: string;
    reservedConcurrentExecutions?: number;
    lambdaEnvVariables?: Record<string, string>;
}

/**
 * AWS CDK stack for deploying a Docker-based Lambda function.
 *
 * This stack creates a Docker image asset from the specified Docker file, sets up a Lambda function
 * using that image, configures the function with the provided VPC, subnets, and security group,
 * and assigns an IAM role with the necessary permissions. Optionally, an SQS event source is added to trigger
 * the function.
 *
 * @example
 * const apiLambdaStack = new ApiLambdaStack(app, {
 *   vpc: myVpc,
 *   functionName: "myFunction",
 *   timeoutSeconds: 30,
 *   memorySizeMbs: 512,
 *   pathDockerFile: "./path/to/dockerfile",
 *   dockerFile: "Dockerfile",
 *   vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_NAT },
 *   arnQueueTrigger: "arn:aws:sqs:region:account:queueName",
 *   reservedConcurrentExecutions: 5,
 *   // additional properties from M47StackProps...
 * });
 */
export class ApiLambdaStack extends M47Stack {
    public lambdaFunction: Lambda.Function;

    /**
     * Constructs a new instance of the ApiLambdaStack.
     *
     * This constructor creates the Docker image asset, IAM role, and the Lambda function with the
     * provided configurations. If an ARN for an SQS queue trigger is provided, it attaches an SQS event source.
     *
     * @param scope - The scope in which this stack is defined.
     * @param props - The properties for configuring the API Lambda stack.
     */
    constructor(scope: Construct, props: ApiLambdaStackProps) {
        super(scope, props);

        // Create the Docker image asset from the specified Docker file
        const code = DockerImageCode.fromImageAsset(props.pathDockerFile, {
            file: props.dockerFile,
        });

        // Create the IAM role for the Lambda function
        const role = this.createRole(props);

        // Define the properties for the Docker image-based Lambda function
        const buildingOptions: DockerImageFunctionProps = {
            vpc: props.vpc,
            vpcSubnets: props.vpcSubnets,
            securityGroups: [this.createSecurityGroup(props.vpc)],
            functionName:
                `${props.functionName}-${props.envName}`.toLowerCase(),
            memorySize: Number(props.memorySizeMbs),
            timeout: Duration.seconds(Number(props.timeoutSeconds)),
            environment: {
                ASPNETCORE_ENVIRONMENT: props.envName,
                ...(props.lambdaEnvVariables || {}),
            },
            code: code,
            role: role,
            reservedConcurrentExecutions: props.reservedConcurrentExecutions,
        };

        // Create the Lambda function using the Docker image
        this.lambdaFunction = new DockerImageFunction(
            this,
            `DockerImageFunction-${this.getStackId()}`,
            buildingOptions,
        );

        // If an SQS queue trigger ARN is provided, add an SQS event source to the Lambda function
        if (props.arnQueueTrigger) {
            const queue = Queue.fromQueueArn(
                this,
                `Queue-${this.getStackId()}`,
                props.arnQueueTrigger,
            );
            const sqsEventSource = new SqsEventSource(queue, {
                batchSize: 10,
            });
            this.lambdaFunction.addEventSource(sqsEventSource);
        }

        // Tag the Lambda function with project-specific tags
        this.addProjectTags(this.lambdaFunction, props);
    }

    /**
     * Creates a security group for the Lambda function.
     *
     * The security group allows outbound HTTPS and HTTP traffic, and permits PostgreSQL connections (port 5432)
     * to the VPC. This enables the Lambda function to communicate with external APIs and internal databases.
     *
     * @param vpc - The VPC where the security group will be created.
     * @returns The created security group.
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
            Peer.ipv4(vpc.vpcCidrBlock),
            tcp5432,
            "Allow PostgreSQL inbound from VPC",
        );

        lambdaSecurityGroup.addEgressRule(
            Peer.ipv4(LEGACY_VPC_CIDR),
            tcp5432,
            "Allow PostgreSQL inbound from legacy VPC",
        );

        return lambdaSecurityGroup;
    }

    /**
     * Creates an IAM role for the Lambda function.
     *
     * This role is granted permissions for various AWS services such as DynamoDB, RDS, EC2,
     * CloudWatch, SQS, SNS, and others required for the function's operation. It also includes
     * the necessary permissions to pass roles and access Secrets Manager and S3.
     *
     * @param props - The API Lambda stack properties.
     * @returns The created IAM role.
     */
    private createRole(props: ApiLambdaStackProps) {
        const role = new Role(this, "LambdaRole", {
            roleName: `Role${props.functionName}${props.envName}`,
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
                    "sqs:ListQueues",
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

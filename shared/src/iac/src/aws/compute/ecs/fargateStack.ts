import { Duration, RemovalPolicy, aws_ecs } from "aws-cdk-lib";
import { MetricAggregationType } from "aws-cdk-lib/aws-autoscaling";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { MathExpression } from "aws-cdk-lib/aws-cloudwatch";
import {
    type ISecurityGroup,
    type IVpc,
    Peer,
    Port,
    SecurityGroup,
} from "aws-cdk-lib/aws-ec2";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import {
    Cluster,
    type ContainerDefinitionOptions,
    ContainerImage,
    ContainerInsights,
    FargatePlatformVersion,
    FargateService,
    type FargateServiceProps,
    FargateTaskDefinition,
    type FargateTaskDefinitionProps,
    type ICluster,
    LogDrivers,
    type TaskDefinition,
} from "aws-cdk-lib/aws-ecs";
import {
    NetworkLoadBalancer,
    NetworkTargetGroup,
    Protocol,
    TargetType,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {
    type IRole,
    PolicyStatement,
    Role,
    ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import type { IBucket } from "aws-cdk-lib/aws-s3";
import { type IQueue, Queue } from "aws-cdk-lib/aws-sqs";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../../config/shared/m47Stack";

/**
 * Properties for configuring the FargateStack.
 *
 * This interface extends the base M47StackProps with additional properties needed
 * for deploying an ECS Fargate service.
 */
export interface FargateStackProps extends M47StackProps {
    vpc: IVpc;
    cpu?: number;
    memoryLimitMiB?: number;
    serviceName: string;
    directoryDockerfile: string;
    filenameDockerfile: string;
    queueArn?: string;
    clusterName: string;
    rdsSecurityGroupId?: string;
    maxCapacity?: number;
    containerTcpPort?: number;
    loadBalancerArn?: string;
    certificateArn?: string;
    domain?: string;
    subdomain?: string;
    storageBucket?: IBucket;
    includeTelemetry?: boolean;
}

/**
 * AWS CDK stack for deploying an ECS Fargate service.
 *
 * This stack builds a Docker image asset, creates a Fargate task definition with a container,
 * sets up an ECS cluster, and deploys a Fargate service. It also configures auto scaling based on
 * SQS queue metrics and optionally sets up a network load balancer with HTTPS support.
 *
 * @example
 * const fargateStack = new FargateStack(app, { ... });
 */
export class FargateStack extends M47Stack {
    /**
     * Constructs a new instance of the FargateStack.
     *
     * The constructor creates the Docker image asset, task definition, ECS cluster, and service.
     *
     * @param scope - The scope in which this stack is defined.
     * @param props - The stack properties including ECS and Docker configuration.
     */
    constructor(scope: Construct, props: FargateStackProps) {
        super(scope, props);

        const asset = new DockerImageAsset(
            this,
            `${props.stackName}-asset`.toLowerCase(),
            {
                directory: props.directoryDockerfile,
                file: props.filenameDockerfile,
            },
        );

        const fargateTaskDefinition = this.createFargateTask(
            props,
            asset,
            this.createRole(props),
            props.storageBucket,
        );

        asset.repository.grantPull(fargateTaskDefinition.taskRole);

        const cluster = this.createCluster(props);

        this.createService(
            props,
            fargateTaskDefinition,
            cluster,
            props.queueArn,
            props.rdsSecurityGroupId,
        );
    }

    /**
     * Creates the Fargate service.
     *
     * This method sets up the security groups, defines the Fargate service properties,
     * and deploys the service. It also configures auto scaling based on an SQS queue if a queue ARN is provided.
     * Additionally, it attaches a network load balancer if container port and load balancer ARN are specified.
     *
     * @param props - The Fargate stack properties.
     * @param taskDefinition - The task definition to run.
     * @param cluster - The ECS cluster where the service will run.
     * @param queueArn - (Optional) The ARN of the SQS queue used for auto scaling.
     * @param rdsSecurityGroupId - (Optional) The security group ID for RDS to include in service security groups.
     */
    private createService(
        props: FargateStackProps,
        taskDefinition: TaskDefinition,
        cluster: ICluster,
        queueArn?: string,
        rdsSecurityGroupId?: string,
    ) {
        const securityGroup = new SecurityGroup(
            this,
            `sg-${props.stackName}`.toLowerCase(),
            {
                vpc: props.vpc,
                allowAllOutbound: true,
                description: "Allow all traffic",
                securityGroupName: `${props.stackName}-sg`,
            },
        );
        securityGroup.addIngressRule(
            Peer.ipv4(props.vpc.vpcCidrBlock),
            Port.allTraffic(),
            "Allow all traffic from VPC",
        );

        securityGroup.addEgressRule(
            Peer.ipv4("10.0.0.0/16"),
             Port.allTraffic(),
            "Allow all traffic from legacy VPC",
        );
        
        const securityGroups: ISecurityGroup[] = [securityGroup];

        if (rdsSecurityGroupId) {
            const rdsSecurityGroup = SecurityGroup.fromSecurityGroupId(
                this,
                "RdsSecurityGroup",
                rdsSecurityGroupId,
            );
            securityGroups.push(rdsSecurityGroup);
        }

        const fargateServiceProps: FargateServiceProps = {
            taskDefinition: taskDefinition,
            cluster: cluster,
            minHealthyPercent: 100,
            maxHealthyPercent: 200,
            platformVersion: FargatePlatformVersion.LATEST,
            serviceName: props.serviceName,
            capacityProviderStrategies: [
                {
                    capacityProvider: "FARGATE_SPOT",
                    weight: 1,
                },
            ],
            assignPublicIp: false,
            securityGroups: securityGroups,
        };

        const service = new FargateService(
            this,
            `service-${this.stackName}`.toLowerCase(),
            fargateServiceProps,
        );

        if (queueArn) {
            const queue = Queue.fromQueueArn(this, "MyQueue", queueArn);
            this.createAutoScaling(queue, service, props.maxCapacity);
        }

        if (
            props.containerTcpPort !== null &&
            props.containerTcpPort !== undefined &&
            props.loadBalancerArn &&
            props.loadBalancerArn?.length
        ) {
            const nlb = NetworkLoadBalancer.fromNetworkLoadBalancerAttributes(
                this,
                "NLB",
                {
                    loadBalancerArn: props.loadBalancerArn,
                },
            );

            // Create a target group for the network load balancer
            const targetGroup = new NetworkTargetGroup(
                this,
                `TargetGroup-${this.stackName}`,
                {
                    vpc: props.vpc,
                    protocol: Protocol.TCP,
                    port: props.containerTcpPort,
                    targetType: TargetType.IP,
                },
            );

            // Add an HTTP listener to the load balancer
            nlb.addListener(`Listener-${this.stackName}`, {
                port: 80,
                defaultTargetGroups: [targetGroup],
            });

            const certificate = Certificate.fromCertificateArn(
                this,
                "certificate",
                props.certificateArn as string,
            );

            // Add an HTTPS listener to the load balancer using TLS and the provided certificate
            nlb.addListener(`Listener-https-${this.stackName}`, {
                port: 443,
                protocol: Protocol.TLS,
                certificates: [certificate],
                defaultTargetGroups: [targetGroup],
            });

            service.attachToNetworkTargetGroup(targetGroup);
        }
    }

    /**
     * Creates a Fargate task definition.
     *
     * This method defines a new Fargate task definition using the provided Docker image asset and IAM role.
     * It adds a container with logging configuration and optional telemetry sidecar. If a container TCP port
     * is specified, the container is configured with a port mapping.
     *
     * @param props - The Fargate stack properties.
     * @param asset - The Docker image asset to use for the container.
     * @param role - The IAM role for the task.
     * @param bucket - (Optional) An S3 bucket to grant read/write permissions.
     * @returns The configured Fargate task definition.
     */
    private createFargateTask(
        props: FargateStackProps,
        asset: DockerImageAsset,
        role: IRole,
        bucket?: IBucket,
    ) {
        const propsDeftask: FargateTaskDefinitionProps = {
            cpu: props.cpu,
            memoryLimitMiB: props.memoryLimitMiB,
            executionRole: role,
            taskRole: role,
            family: `${props.githubRepo}-${props.name}-${props.envName}`.toLowerCase(),
        };

        const taskDefinition = new FargateTaskDefinition(
            this,
            `${props.name}-TaskDefinition-${props.envName}`,
            propsDeftask,
        );

        const container = taskDefinition.addContainer(
            `${props.name}Container`,
            {
                image: ContainerImage.fromEcrRepository(
                    asset.repository,
                    asset.imageTag,
                ),
                environment: {
                    ASPNETCORE_ENVIRONMENT: props.envName,
                    BUCKET_NAME: bucket?.bucketName ?? "",
                },
                logging: LogDrivers.awsLogs({
                    streamPrefix:
                        `aws/ecs/${props.githubRepo}/${props.envName}/${props.name}`.toLowerCase(),
                    logGroup: new LogGroup(
                        this,
                        `${props.githubRepo}-${props.name}-${props.envName}`.toLowerCase(),
                        {
                            logGroupName:
                                `${props.githubRepo}-${props.name}-${props.envName}`.toLowerCase(),
                            retention: RetentionDays.ONE_YEAR,
                            removalPolicy: RemovalPolicy.DESTROY,
                        },
                    ),
                }),
            },
        );

        if (props.includeTelemetry) {
            const sidecarOptions: ContainerDefinitionOptions = {
                image: ContainerImage.fromRegistry("amazon/aws-otel-collector"),
                environment: {
                    OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
                },
            };

            taskDefinition.addContainer(`${props.name}Sidecar`, sidecarOptions);
        }

        if (
            props.containerTcpPort !== null &&
            props.containerTcpPort !== undefined
        ) {
            container.addPortMappings({
                containerPort: props.containerTcpPort,
                protocol: aws_ecs.Protocol.TCP,
            });
        }

        bucket?.grantReadWrite(role);

        return taskDefinition;
    }

    /**
     * Creates an ECS cluster.
     *
     * This method creates a new ECS cluster in the specified VPC with container insights enabled.
     *
     * @param props - The Fargate stack properties.
     * @returns The newly created ECS cluster.
     */
    private createCluster(props: FargateStackProps) {
        return new Cluster(this, "Cluster", {
            vpc: props.vpc,
            clusterName: props.clusterName,
            containerInsightsV2: ContainerInsights.ENABLED,
        });
    }

    /**
     * Creates an IAM role for the Fargate task.
     *
     * This role allows ECS tasks to assume the necessary permissions.
     *
     * @param props - The Fargate stack properties.
     * @returns The created IAM role.
     */
    private createRole(props: FargateStackProps) {
        const role = new Role(this, "FargateContainerRole", {
            roleName: `${props.stackName}-TaskRole-${props.envName}`,
            assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
        });

        role.addToPolicy(
            new PolicyStatement({ actions: ["*"], resources: ["*"] }),
        );

        return role;
    }

    /**
     * Configures auto scaling for the Fargate service based on SQS queue metrics.
     *
     * Two scaling policies are configured: one for scaling out when there are messages in the queue,
     * and another for scaling in when the queue is empty.
     *
     * @param queue - The SQS queue used to derive scaling metrics.
     * @param service - The Fargate service to scale.
     * @param maxCapacity - (Optional) Maximum capacity for the service.
     */
    private createAutoScaling(
        queue: IQueue,
        service: FargateService,
        maxCapacity?: number,
    ) {
        const scaling = service.autoScaleTaskCount({
            minCapacity: 0,
            maxCapacity: maxCapacity ?? 1,
        });

        scaling.scaleOnMetric("ScaleOut", {
            metric: queue.metricApproximateNumberOfMessagesVisible({
                period: Duration.seconds(10),
                statistic: "avg",
            }),
            scalingSteps: [
                { lower: 0, upper: 0, change: 0 }, // No changes if queue is empty
                { lower: 1, upper: Number.POSITIVE_INFINITY, change: +1 }, // Scale out (up) by 1 if there is at least 1 message in the queue
            ],
            cooldown: Duration.seconds(10),
            metricAggregationType: MetricAggregationType.AVERAGE,
            datapointsToAlarm: 1,
            evaluationPeriods: 1,
        });

        scaling.scaleOnMetric("ScaleIn", {
            metric: new MathExpression({
                label: `ApproximateNumberOfMessages-${queue.queueName}`,
                expression: "IF(m1 + m2 > 0, 1, 0)",
                usingMetrics: {
                    m1: queue.metricApproximateNumberOfMessagesVisible({
                        period: Duration.minutes(1),
                        statistic: "sum",
                    }),
                    m2: queue.metricApproximateNumberOfMessagesNotVisible({
                        period: Duration.minutes(1),
                        statistic: "sum",
                    }),
                },
                period: Duration.minutes(1),
            }),
            scalingSteps: [
                { lower: 1, upper: Number.POSITIVE_INFINITY, change: 0 }, // No changes if queue contains any message
                { lower: 0, upper: 0, change: -1 }, // Scale in (down) by 1 if queue is empty
            ],
            cooldown: Duration.minutes(15),
            metricAggregationType: MetricAggregationType.AVERAGE,
            datapointsToAlarm: 3,
            evaluationPeriods: 3,
        });
    }
}

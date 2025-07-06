import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import {
    AccessLogFormat,
    ConnectionType,
    EndpointType,
    HttpIntegration,
    LogGroupLogDestination,
    RestApi,
    VpcLink,
    type LambdaRestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { Alarm, ComparisonOperator } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { NetworkLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { ApiGateway } from "aws-cdk-lib/aws-route53-targets";
import { Topic } from "aws-cdk-lib/aws-sns";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../config/shared/m47Stack";

/**
 * Properties for configuring the API Gateway ECS integration stack.
 *
 * This interface extends the base M47StackProps and adds properties required for setting up a custom domain
 * and integrating API Gateway with an existing Network Load Balancer (NLB).
 *
 * @property subdomain - The subdomain to use for the custom domain.
 * @property domain - The root domain name.
 * @property certificateArn - The ARN of the ACM certificate for the custom domain.
 * @property loadBalancerArn - The ARN of the existing Network Load Balancer.
 *
 * @example
 * const props: ApiGatewayEcsStackProps = {
 *   subdomain: "api",
 *   domain: "example.com",
 *   certificateArn: "arn:aws:acm:region:account:certificate/abc123",
 *   loadBalancerArn: "arn:aws:elasticloadbalancing:region:account:loadbalancer/net/my-nlb/abc123",
 *   // plus additional M47StackProps properties...
 * };
 */
export interface ApiGatewayEcsStackProps extends M47StackProps {
    subdomain: string;
    domain: string;
    certificateArn: string;
    loadBalancerArn: string;
}

/**
 * ApiGatewayEcsStack provisions an API Gateway REST API that integrates with an existing ECS service
 * exposed via a Network Load Balancer (NLB). This stack configures a custom domain for the API,
 * sets up access logging, creates a proxy integration with the NLB, and creates Route53 DNS records.
 *
 * The API Gateway is configured to forward all requests to the NLB through a VPC Link. Additionally,
 * a CloudWatch alarm is created to monitor server errors, with notifications sent via SNS.
 *
 * @example
 * new ApiGatewayEcsStack(app, {
 *   subdomain: "api",
 *   domain: "example.com",
 *   certificateArn: "arn:aws:acm:region:account:certificate/abc123",
 *   loadBalancerArn: "arn:aws:elasticloadbalancing:region:account:loadbalancer/net/my-nlb/abc123",
 *   // plus additional M47StackProps properties...
 * });
 */
export class ApiGatewayEcsStack extends M47Stack {
    constructor(scope: Construct, props: ApiGatewayEcsStackProps) {
        super(scope, props);

        // Import the certificate for the custom domain.
        const certificate = Certificate.fromCertificateArn(
            this,
            "certificate",
            props.certificateArn,
        );

        // Look up the existing Network Load Balancer.
        const nlb = NetworkLoadBalancer.fromLookup(
            this,
            `NLB-${this.stackName}`,
            {
                loadBalancerArn: props.loadBalancerArn,
            },
        );

        // Create a VPC Link for API Gateway to route requests to the NLB.
        const vpcLink = new VpcLink(this, `VpcLink-${this.stackName}`, {
            targets: [nlb],
            description: "VPC Link to the NLB",
            vpcLinkName: `VpcLink-${this.stackName}`,
        });

        vpcLink.applyRemovalPolicy(RemovalPolicy.DESTROY);

        // Create a log group for API Gateway access logs.
        const logGroup = new LogGroup(
            this,
            `ApiGatewayAccessLogs-${this.stackName}`,
            {
                removalPolicy: RemovalPolicy.DESTROY,
                retention: RetentionDays.ONE_YEAR,
            },
        );

        // Set up the API Gateway with custom domain and logging configuration.
        const restApi = new RestApi(this, `EcsRestApi-${this.stackName}`, {
            description: "API Gateway ECS Fargate",
            cloudWatchRole: true,
            binaryMediaTypes: ["multipart/form-data"],
            deployOptions: {
                accessLogDestination: new LogGroupLogDestination(logGroup),
                accessLogFormat: AccessLogFormat.clf(),
            },
            domainName: {
                domainName: `${props.subdomain}.${props.domain}`.toLowerCase(),
                certificate: certificate,
                endpointType: EndpointType.EDGE,
            },
        });

        // Create an HTTP integration that forwards requests to the NLB.
        const integration = new HttpIntegration(
            `http://${nlb.loadBalancerDnsName}/{proxy}`,
            {
                httpMethod: "ANY",
                options: {
                    connectionType: ConnectionType.VPC_LINK,
                    vpcLink: vpcLink,
                    requestParameters: {
                        "integration.request.path.proxy":
                            "method.request.path.proxy",
                    },
                },
                proxy: true,
            },
        );

        // Add a proxy resource to the API Gateway root to handle all requests.
        const proxyResource = restApi.root.addResource("{proxy+}");
        proxyResource.addMethod("ANY", integration, {
            requestParameters: {
                "method.request.path.proxy": true,
            },
        });

        // Create a DNS record in Route53 for the custom domain.
        new ARecord(this, `ARecord-${this.stackName}`, {
            zone: HostedZone.fromLookup(this, "baseZone", {
                domainName: props.domain,
            }),
            recordName: `${props.subdomain}.${props.domain}`.toLowerCase(),
            target: RecordTarget.fromAlias(new ApiGateway(restApi)),
        });

        // Create a CloudWatch alarm to monitor API Gateway server errors.
        this.createAlarm(restApi);

        // Output the API URL and DNS record URL.
        new CfnOutput(this, "apiUrl", { value: restApi.url });
        new CfnOutput(this, "recordUrl", {
            value: `https://${props.subdomain}.${props.domain}`.toLowerCase(),
        });

        // Apply project-specific tags to the API Gateway.
        this.addProjectTags(restApi, props);
    }

    /**
     * Creates a CloudWatch alarm for API Gateway server errors and sets up SNS notifications.
     *
     * The alarm monitors the "ServerError" metric for the API Gateway deployment stage. If the
     * number of server errors meets or exceeds the threshold, an SNS notification is triggered.
     *
     * @param restApi - The API Gateway REST API instance.
     */
    private createAlarm(restApi: LambdaRestApi) {
        const metric = restApi.deploymentStage.metricServerError();
        const alarm = new Alarm(
            this,
            `ApiGatewayErrorAlarm-${this.stackName}`,
            {
                alarmDescription: "API Gateway Error Alarm",
                metric: metric,
                threshold: 1,
                evaluationPeriods: 1,
                comparisonOperator:
                    ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                actionsEnabled: true,
            },
        );

        const topic = new Topic(
            this,
            `ApiGatewayErrorTopic-${this.stackName}`,
            {
                displayName: "API Gateway Error Topic",
            },
        );

        alarm.addAlarmAction(new SnsAction(topic));
    }
}

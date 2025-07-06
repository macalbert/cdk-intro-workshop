import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import {
    AccessLogFormat,
    Cors,
    EndpointType,
    LambdaRestApi,
    LogGroupLogDestination,
} from "aws-cdk-lib/aws-apigateway";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { Alarm, ComparisonOperator } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import type { IFunction } from "aws-cdk-lib/aws-lambda";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { ApiGateway } from "aws-cdk-lib/aws-route53-targets";
import { Topic } from "aws-cdk-lib/aws-sns";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../config/shared/m47Stack";

/**
 * Properties for configuring the API Gateway stack.
 *
 * This interface extends the base M47StackProps with additional properties required
 * to integrate a Lambda function with API Gateway using a custom domain.
 *
 * Properties include:
 * - lambdaFunction: The Lambda function to expose via API Gateway.
 * - subdomain: The subdomain for the custom domain.
 * - domain: The root domain name.
 * - certificateArn: The ARN of the ACM certificate for the custom domain.
 *
 * @example
 * const props: ApiGatewayStackProps = {
 *   lambdaFunction: myLambdaFunction,
 *   subdomain: "api",
 *   domain: "example.com",
 *   certificateArn: "arn:aws:acm:region:account:certificate/abc123",
 *   // plus additional M47StackProps properties...
 * };
 */
export interface ApiGatewayStackProps extends M47StackProps {
    lambdaFunction: IFunction;
    subdomain: string;
    domain: string;
    certificateArn: string;
}

/**
 * ApiGatewayStack provisions an API Gateway REST API to expose a Lambda function
 * using a custom domain name. The stack sets up access logging, CORS settings, and Route53 DNS records.
 *
 * The API Gateway is configured with a LambdaRestApi that routes all incoming requests to the provided Lambda function.
 * It also creates a CloudWatch alarm for server errors and outputs the API URL and DNS record URL.
 *
 * @example
 * new ApiGatewayStack(app, {
 *   lambdaFunction: myLambdaFunction,
 *   subdomain: "api",
 *   domain: "example.com",
 *   certificateArn: "arn:aws:acm:region:account:certificate/abc123",
 *   // plus additional M47StackProps properties...
 * });
 */
export class ApiGatewayStack extends M47Stack {
    constructor(scope: Construct, props: ApiGatewayStackProps) {
        super(scope, props);

        // Import the ACM certificate for the custom domain.
        const acmCertificate = Certificate.fromCertificateArn(
            this,
            "certificate",
            props.certificateArn,
        );

        // Create a log group for API Gateway access logs.
        const logGroup = new LogGroup(this, "ApiGatewayAccessLogs", {
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.ONE_YEAR,
        });

        // Create the REST API with Lambda integration and custom domain settings.
        const restApi = new LambdaRestApi(
            this,
            `LambdaRestApi-${this.stackName}`,
            {
                handler: props.lambdaFunction,
                cloudWatchRole: true,
                defaultCorsPreflightOptions: {
                    allowHeaders: [
                        "Cache-Control",
                        "Content-Language",
                        "Content-Type",
                        "Expires",
                        "Last-Modified",
                        "Pragma",
                        "Acceptencoding",
                        "Authorization",
                        "X-Amz-Date",
                        "X-Api-Key",
                        "X-Forwarded-For"
                    ],
                    allowMethods: Cors.ALL_METHODS,
                    allowCredentials: true,
                    allowOrigins: Cors.ALL_ORIGINS,
                },
                binaryMediaTypes: ["multipart/form-data"],
                deployOptions: {
                    accessLogDestination: new LogGroupLogDestination(logGroup),
                    accessLogFormat: AccessLogFormat.clf(),
                },
                domainName: {
                    domainName:
                        `${props.subdomain}.${props.domain}`.toLowerCase(),
                    certificate: acmCertificate,
                    endpointType: EndpointType.EDGE,
                },
            },
        );

        // Create a Route53 A record that maps the custom domain to the API Gateway.
        new ARecord(this, `ARecord-${this.stackName}`, {
            zone: HostedZone.fromLookup(this, "baseZone", {
                domainName: props.domain,
            }),
            recordName: `${props.subdomain}.${props.domain}`.toLowerCase(),
            target: RecordTarget.fromAlias(new ApiGateway(restApi)),
        });

        // Create CloudWatch alarms for API Gateway server errors.
        this.createAlarm(props, restApi);

        // Output the API URL and DNS record URL.
        new CfnOutput(this, "apiUrl", { value: restApi.url });
        new CfnOutput(this, "recordUrl", {
            value: `https://${props.subdomain}.${props.domain}`.toLowerCase(),
        });

        // Tag the API Gateway with project-specific tags.
        this.addProjectTags(restApi, props);
    }

    /**
     * Creates a CloudWatch alarm for API Gateway server errors and configures SNS notifications.
     *
     * This method monitors the "ServerError" metric for the API Gateway deployment stage.
     * If the error count meets or exceeds the threshold, an SNS notification is triggered.
     *
     * @param props - The API Gateway stack properties.
     * @param restApi - The API Gateway REST API instance.
     */
    private createAlarm(props: ApiGatewayStackProps, restApi: LambdaRestApi) {
        const metric = restApi.deploymentStage.metricServerError();
        const alarm = new Alarm(
            this,
            `ApiGatewayErrorAlarm-${this.stackName}`,
            {
                metric: metric,
                threshold: 1,
                evaluationPeriods: 1,
                comparisonOperator:
                    ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription: "API Gateway Error Alarm",
                actionsEnabled: true,
            },
        );

        const topic = new Topic(this, "ApiGatewayErrorTopic", {
            displayName: "API Gateway Error Topic",
        });

        alarm.addAlarmAction(new SnsAction(topic));

        const lambdaFnAlarm = new Alarm(
            this,
            `LambdaFunctionErrorAlarm-${this.stackName}`,
            {
                metric: props.lambdaFunction.metricErrors(),
                threshold: 1,
                evaluationPeriods: 1,
                comparisonOperator:
                    ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription: "Lambda Function Error Alarm",
                actionsEnabled: true,
            },
        );

        lambdaFnAlarm.addAlarmAction(new SnsAction(topic));
    }
}

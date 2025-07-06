import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Alarm, ComparisonOperator, Metric } from "aws-cdk-lib/aws-cloudwatch";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { SfnStateMachine } from "aws-cdk-lib/aws-events-targets";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import {
    DefinitionBody,
    LogLevel,
    StateMachine,
    StateMachineType,
} from "aws-cdk-lib/aws-stepfunctions";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../config/shared/m47Stack";

/**
 * Properties for configuring the StepFunctionsStack.
 *
 * This interface extends M47StackProps and adds additional properties:
 * - lambdaArn: The ARN of the Lambda function to be invoked by the state machine.
 * - scheduleMinutes: The interval in minutes at which the state machine should be triggered.
 *
 * @example
 * const props: StepFunctionsStackProps = {
 *   ...otherM47StackProps,
 *   lambdaArn: "arn:aws:lambda:region:account:function:myFunction",
 *   scheduleMinutes: 10,
 * };
 */
export interface StepFunctionsStackProps extends M47StackProps {
    lambdaArn: string;
    scheduleMinutes: number;
}

/**
 * StepFunctionsStack provisions a Step Functions state machine that periodically triggers a Lambda function.
 *
 * The state machine is defined with a simple Amazon States Language (ASL) definition that invokes the specified
 * Lambda function and then ends. A dedicated log group captures execution logs, and the state machine is scheduled
 * to run at a fixed interval using an EventBridge (CloudWatch Events) rule.
 *
 * In addition, a CloudWatch alarm monitors the number of executions started by the state machine, and SNS topics
 * are configured to send notifications via email (and optionally via Slack) in response to state changes.
 *
 * @example
 * const stepFunctionsStack = new StepFunctionsStack(app, {
 *   ...otherM47StackProps,
 *   lambdaArn: "arn:aws:lambda:region:account:function:myFunction",
 *   scheduleMinutes: 10,
 * });
 */
export class StepFunctionsStack extends M47Stack {
    /**
     * Constructs a new instance of the StepFunctionsStack.
     *
     * This constructor creates the state machine using the provided Lambda ARN, sets up logging, adds the required
     * IAM policies to the state machine role, schedules periodic execution via an EventBridge rule, and creates
     * CloudWatch alarms and notifications for monitoring purposes.
     *
     * @param scope - The scope in which this stack is defined.
     * @param props - The properties for configuring the state machine and its schedule.
     */
    constructor(scope: Construct, props: StepFunctionsStackProps) {
        super(scope, props);

        // Define the ASL (Amazon States Language) definition for the state machine.
        const aslDefinition = {
            StartAt: "InvokeLambda",
            States: {
                InvokeLambda: {
                    Type: "Task",
                    Resource: props.lambdaArn,
                    End: true,
                },
            },
        };

        // Create a log group for the state machine execution logs.
        const logGroup = new LogGroup(
            this,
            `${props.githubRepo}-${props.name}-${props.envName}`.toLowerCase(),
            {
                logGroupName:
                    `${props.githubRepo}-${props.name}-${props.envName}`.toLowerCase(),
                retention: RetentionDays.ONE_YEAR,
                removalPolicy: RemovalPolicy.RETAIN,
            },
        );

        // Create the state machine with the ASL definition and logging configuration.
        const stateMachine = new StateMachine(
            this,
            `${props.githubRepo}-${props.name}-StateMachine`,
            {
                definitionBody: DefinitionBody.fromString(
                    JSON.stringify(aslDefinition),
                ),
                stateMachineType: StateMachineType.STANDARD,
                stateMachineName:
                    `${props.githubRepo}-${props.name}`.toLowerCase(),
                logs: {
                    destination: logGroup,
                    level: LogLevel.ALL,
                    includeExecutionData: true,
                },
            },
        );

        // Grant the state machine permission to create log streams and put log events.
        stateMachine.addToRolePolicy(
            new PolicyStatement({
                actions: ["logs:CreateLogStream", "logs:PutLogEvents"],
                resources: [logGroup.logGroupArn],
            }),
        );

        // Grant the state machine permission to invoke the specified Lambda function.
        stateMachine.addToRolePolicy(
            new PolicyStatement({
                actions: ["lambda:InvokeFunction"],
                resources: [props.lambdaArn],
            }),
        );

        // Create an EventBridge rule to trigger the state machine on a schedule.
        const rule = new Rule(
            this,
            `${props.githubRepo}-${props.name}-ScheduleRule`,
            {
                schedule: Schedule.rate(
                    Duration.minutes(props.scheduleMinutes),
                ),
            },
        );

        // Set the state machine as the target for the scheduled rule.
        rule.addTarget(new SfnStateMachine(stateMachine));

        // Create an SNS topic for Step Functions alarm notifications.
        const topic = new Topic(
            this,
            `${props.githubRepo}-${props.name}-AlarmTopic`,
            {
                displayName: "Step Functions Alarm Notifications",
            },
        );

        // Subscribe an email address to the SNS topic.
        topic.addSubscription(
            new EmailSubscription("marcal.albert@m47labs.com"),
        );

        // Create a CloudWatch alarm to monitor the number of executions started by the state machine.
        new Alarm(this, `${props.githubRepo}-${props.name}-ExecutionAlarm`, {
            alarmDescription:
                "Triggers if the Step Functions State Machine stops running executions.",
            metric: new Metric({
                namespace: "AWS/States",
                metricName: "ExecutionsStarted",
                dimensionsMap: {
                    StateMachineArn: stateMachine.stateMachineArn,
                },
                period: Duration.minutes(5),
                statistic: "Sum",
            }),
            threshold: 0,
            evaluationPeriods: 1,
            comparisonOperator:
                ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
        });

        // Output the ARN of the state machine for reference.
        new CfnOutput(
            this,
            `${props.githubRepo}-${props.name}-StateMachineArn`,
            {
                value: stateMachine.stateMachineArn,
                description: `The StepFunction ${props.githubRepo} ${props.name} ${props.envName}`,
                exportName: `${this.toCloudFormation()}-${props.name}-StateMachineArn`,
            },
        );
    }
}

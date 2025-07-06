import { CfnOutput, Duration } from "aws-cdk-lib";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { type DeadLetterQueue, type IQueue, Queue } from "aws-cdk-lib/aws-sqs";
import { ParameterTier, StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../config/shared/m47Stack";

/**
 * Properties for configuring the SQS stack.
 *
 * This interface extends the base M47StackProps and adds SQS-specific properties.
 *
 * Properties include:
 * - queueName: The name of the main SQS queue.
 * - deadLetter: A boolean indicating whether a dead letter queue should be created.
 * - maxReceiveCount: The maximum number of times a message is received before it is moved to the dead letter queue.
 * - visibilityTimeout: (Optional) The visibility timeout for the main queue.
 * - retentionPeriod: (Optional) The message retention period for both queues.
 */
export interface SqsStackProps extends M47StackProps {
    queueName: string;
    deadLetter: boolean;
    maxReceiveCount: number;
    visibilityTimeout?: Duration;
    retentionPeriod?: Duration;
}

/**
 * SqsStack provisions an Amazon SQS queue along with an optional dead letter queue.
 *
 * This stack creates a main queue using the provided configurations. If deadLetter is set to true,
 * a dead letter queue is also created with the specified maximum receive count.
 *
 * Additionally, the queue URL is stored as a Systems Manager string parameter for external reference,
 * and the ARNs for the queues are output as CloudFormation outputs.
 *
 * @example
 * const sqsStack = new SqsStack(app, {
 *   queueName: "my-queue",
 *   deadLetter: true,
 *   maxReceiveCount: 5,
 *   retentionPeriod: Duration.days(7),
 *   // plus additional properties from M47StackProps...
 * });
 */
export class SqsStack extends M47Stack {
    public readonly queue: IQueue;
    public readonly deadLetterQueue: IQueue | undefined;

    /**
     * Constructs a new instance of the SqsStack.
     *
     * The constructor creates the dead letter queue if enabled, the main SQS queue,
     * grants permissions for sending messages to the dead letter queue, and stores the queue URL
     * in Systems Manager Parameter Store for different application types.
     *
     * @param scope - The scope in which this stack is defined.
     * @param props - The properties for configuring the SQS stack.
     */
    constructor(scope: Construct, props: SqsStackProps) {
        super(scope, props);

        const dlQueue: DeadLetterQueue | undefined = props.deadLetter
            ? {
                  queue: new Queue(this, "DeadLetterQueue", {
                      retentionPeriod: props.retentionPeriod,
                      visibilityTimeout: Duration.seconds(0),
                      queueName: `${props.queueName}-deadletter`,
                  }),
                  maxReceiveCount: props.maxReceiveCount,
              }
            : undefined;

        this.deadLetterQueue = dlQueue?.queue;

        this.queue = new Queue(this, "MainQueue", {
            queueName: props.queueName,
            deadLetterQueue: dlQueue,
            deliveryDelay: Duration.seconds(5),
            retentionPeriod: props.retentionPeriod ?? Duration.days(14),
            visibilityTimeout: props.visibilityTimeout ?? Duration.minutes(15),
        });

        // Grant permission to send messages to the dead letter queue
        this.deadLetterQueue?.grantSendMessages(
            new ServicePrincipal("sqs.amazonaws.com"),
        );

        // Create SSM string parameters for referencing the queue URL in different applications
        this.createStringParameter(
            `${this.toCloudFormation()}-${props.queueName}-${props.envName}-api-param`,
            this.queue.queueUrl,
            props,
            "Minimal.Api",
        );
        this.createStringParameter(
            `${this.toCloudFormation()}-${props.queueName}-${props.envName}-workerservice-param`,
            this.queue.queueUrl,
            props,
            "WorkerService",
        );

        new CfnOutput(this, "MainQueueArn", {
            value: this.queue.queueArn,
        });

        if (this.deadLetterQueue) {
            new CfnOutput(this, "DeadLetterQueueArn", {
                value: this.deadLetterQueue.queueArn,
            });
        }
    }

    /**
     * Creates a Systems Manager string parameter to store the SQS queue URL.
     *
     * The parameter name is constructed using the GitHub repository, environment, and stack name
     * in PascalCase format to ensure consistency. The parameter value is the queue URL.
     *
     * @param id - A unique identifier for the parameter.
     * @param secretValue - The queue URL to store.
     * @param props - The SQS stack properties.
     * @param appType - The application type that will use this parameter (e.g., Minimal.Api or WorkerService).
     * @returns The constructed parameter name.
     */
    private createStringParameter(
        id: string,
        secretValue: string,
        props: SqsStackProps,
        appType: string,
    ) {
        const parameterName = `/M47.${this.toPascalCase(props.githubRepo)}.Apps.${appType}/${this.toPascalCase(props.envName)}/${this.toPascalCase(props.name)}/Aws/QueueUrl`;

        const stringParameter = new StringParameter(this, id, {
            allowedPattern: ".*",
            description: `The SQS url ${props.githubRepo} ${props.queueName} ${props.envName}`,
            parameterName: parameterName,
            stringValue: secretValue,
            tier: ParameterTier.STANDARD,
        });

        new CfnOutput(this, `${id}ParameterNameOutput`, {
            value: stringParameter.parameterName,
            description: `The SQS url ${props.githubRepo} ${props.queueName} ${props.envName}`,
            exportName: `${id}ParameterName`,
        });

        return parameterName;
    }

    /**
     * Converts a given string to PascalCase.
     *
     * This method converts the input string to lowercase and then capitalizes the first letter
     * of each word, where words are separated by spaces, underscores, or hyphens.
     *
     * @param str - The input string.
     * @returns The string converted to PascalCase.
     */
    private toPascalCase(str: string): string {
        return str
            .toLowerCase()
            .replace(/(?:^|[\s_-])(\w)/g, (_, c) => c.toUpperCase());
    }
}

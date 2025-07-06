import { RemovalPolicy } from "aws-cdk-lib";
import {
    type ISlackChannelConfiguration,
    type LoggingLevel,
    SlackChannelConfiguration,
} from "aws-cdk-lib/aws-chatbot";
import type { RetentionDays } from "aws-cdk-lib/aws-logs";
import type { ITopic } from "aws-cdk-lib/aws-sns";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../config/shared/m47Stack";

/**
 * Properties for configuring the ChatbotStack.
 *
 * This interface extends the base M47StackProps and adds properties specific to AWS Chatbot
 * configuration, such as notification topics, logging level, log retention, and Slack channel details.
 */
export interface ChatbotStackProps extends M47StackProps {
    notificationTopics: ITopic[];
    loggingLevel: LoggingLevel;
    logRetention: RetentionDays;
    slackChannelId: string;
    slackChannelConfigurationName: string;
    slackWorkspaceId: string;
}

/**
 * AWS CDK stack for configuring AWS Chatbot integrations.
 *
 * This class extends the M47Stack and provides methods to retrieve or create Slack channel configurations
 * required by AWS Chatbot.
 *
 * @remarks
 * Ensure that you provide all required properties as defined in ChatbotStackProps, including details about
 * notification topics, logging configuration, log retention, and Slack channel credentials.
 *
 * @example
 * ```typescript
 * const chatbotStack = new ChatbotStack(app, { ... });
 * const slackConfig = chatbotStack.createSlackChannelConfiguration({
 *   notificationTopics: [...],
 *   loggingLevel: LoggingLevel.INFO,
 *   logRetention: RetentionDays.ONE_WEEK,
 *   slackChannelId: "CXXXXXX",
 *   slackChannelConfigurationName: "MySlackConfig",
 *   slackWorkspaceId: "TXXXXXX",
 * });
 * ```
 */
export class ChatbotStack extends M47Stack {
    props: M47StackProps;

    /**
     * Constructs a new instance of ChatbotStack.
     *
     * @param scope - The scope in which this stack is defined.
     * @param props - The stack properties including AWS Chatbot configuration details.
     */
    constructor(scope: Construct, props: M47StackProps) {
        super(scope, props);
        this.props = props;
    }

    /**
     * Retrieves an existing Slack channel configuration by its ARN.
     *
     * @param arn - The ARN of the Slack channel configuration.
     * @returns An instance of ISlackChannelConfiguration representing the Slack configuration.
     */
    public getSlackChannelConfiguration(
        arn: string,
    ): ISlackChannelConfiguration {
        return SlackChannelConfiguration.fromSlackChannelConfigurationArn(
            this,
            "SlackConfig",
            arn,
        );
    }

    /**
     * Creates a new Slack channel configuration.
     *
     * @param props - The properties required to configure the Slack channel, as defined in ChatbotStackProps.
     * @returns An instance of ISlackChannelConfiguration representing the new Slack channel configuration.
     */
    public createSlackChannelConfiguration(
        props: ChatbotStackProps,
    ): ISlackChannelConfiguration {
        const slackConfig = new SlackChannelConfiguration(
            this,
            `${this.props.githubRepo}-SlackConfig-${this.props.envName}`,
            {
                slackChannelConfigurationName:
                    props.slackChannelConfigurationName,
                slackWorkspaceId: props.slackWorkspaceId,
                slackChannelId: props.slackChannelId,
                logRetention: props.logRetention,
                loggingLevel: props.loggingLevel,
                notificationTopics: props.notificationTopics,
            },
        );

        slackConfig.applyRemovalPolicy(RemovalPolicy.DESTROY);

        return slackConfig;
    }
}

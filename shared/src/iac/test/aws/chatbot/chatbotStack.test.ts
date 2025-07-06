import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { LoggingLevel } from "aws-cdk-lib/aws-chatbot";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import type { ITopic } from "aws-cdk-lib/aws-sns";
import {
	ChatbotStack,
	type ChatbotStackProps,
} from "../../../src/aws/chatbot/chatbotStack";
import { AppEnvironment } from "../../../src/config/env/appEnvironment";

describe("ChatbotStack.tes", () => {
	const env = {
		account: "account",
		region: "eu-west-1",
	};

	test("Should_CreateChatbotStack_When_StackIsCalled", () => {
		// Arrange
		const stack = new Stack(new App(), "chatbotStackTest", { env: env });
		const props = createChatbotStackProps();

		// Act
		const actual = new ChatbotStack(stack, props);
		const slackChannel = actual.createSlackChannelConfiguration(props);

		// Assert
		expect(slackChannel).toBeDefined();
		const template = Template.fromStack(actual);
		expect(template.toJSON()).toMatchSnapshot("chatbotStackTest");
	});

	test("Should_GetChatbotStack_When_StackIsCalled", () => {
		// Arrange
		const stack = new Stack(new App(), "chatbotStackTest", { env: env });
		const props = createChatbotStackProps();
		const actual = new ChatbotStack(stack, props);
		const slackChannel = actual.createSlackChannelConfiguration(props);

		// Act
		const actualSlackChannel = actual.getSlackChannelConfiguration(
			slackChannel.slackChannelConfigurationArn,
		);

		// Assert
		const template = Template.fromStack(actual);
		expect(actualSlackChannel).toBeDefined();
		expect(template.toJSON()).toMatchSnapshot("chatbotStackTest");
	});

	function createChatbotStackProps(): ChatbotStackProps {
		const emptyTopics: ITopic[] = [];
		return {
			name: "chatbotStack",
			envName: AppEnvironment.Test,
			env: env,
			githubRepo: "test",
			stackName: "pipeline-stack",
			slackChannelConfigurationName: "SlackConfig",
			slackWorkspaceId: "WORKSPACEID",
			slackChannelId: "CHANNELID",
			logRetention: RetentionDays.ONE_YEAR,
			loggingLevel: LoggingLevel.NONE,
			notificationTopics: emptyTopics,
		};
	}
});

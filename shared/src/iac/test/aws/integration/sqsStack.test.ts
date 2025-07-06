import { App, Duration, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import {
	SqsStack,
	type SqsStackProps,
} from "../../../src/aws/integration/sqsStack";
import { AppEnvironment } from "../../../src/config/env/appEnvironment";

describe("SQS Stack", () => {
	const env = {
		account: "account",
		region: "eu-west-1",
	};

	test("Should_SqsWithDeadLetter_When_StackIsCalled", () => {
		// Arrange
		const stack = new Stack(new App(), "sqsStackTest", { env: env });
		const props = createSqsStackProps(true);

		// Act
		const actual = new SqsStack(stack, props);

		// Assert
		const template = Template.fromStack(actual);
		expect(template.toJSON()).toMatchSnapshot("sqsStackTest");
	});

	test("Should_SqsWithoutDeadLetter_When_StackIsCalled", () => {
		// Arrange
		const stack = new Stack(new App(), "sqsWithoutDeadLetterStackTest", {
			env: env,
		});
		const props = createSqsStackProps(false);

		// Act
		const actual = new SqsStack(stack, props);

		// Assert
		const template = Template.fromStack(actual);
		expect(template.toJSON()).toMatchSnapshot("sqsWithoutDeadLetterStackTest");
	});

	function createSqsStackProps(deadLetter: boolean): SqsStackProps {
		return {
			env: env,
			name: "SqsStackTest",
			envName: AppEnvironment.Test,
			githubRepo: "test",
			stackName: `test-apigateway`,
			queueName: "string",
			deadLetter: deadLetter,
			maxReceiveCount: 3,
			visibilityTimeout: Duration.minutes(10),
			retentionPeriod: Duration.days(14),
		};
	}
});

import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import {
	StepFunctionsStack,
	type StepFunctionsStackProps,
} from "../../../src/aws/integration/stepFunctionsStack";
import { AppEnvironment } from "../../../src/config/env/appEnvironment";

describe("StepFunctionsStack", () => {
	const env = {
		account: "123456789012",
		region: "eu-west-1",
	};

	const staticFunctionArn =
		"arn:aws:lambda:eu-west-1:123456789012:function:TestLambdaFunction";
	const staticGithubRepo = "testRepo";

	const testProps: StepFunctionsStackProps = {
		envName: AppEnvironment.Test,
		githubRepo: staticGithubRepo,
		lambdaArn: staticFunctionArn,
		scheduleMinutes: 5,
		name: "test",
		stackName: "test",
	};

	test("Should_CreateStateMachineWithCorrectDefinition_When_StackIsSynthesized", () => {
		// Arrange
		const stack = new Stack(new App(), "StepFunctionsTest-Definition", {
			env,
		});

		// Act
		const sut = new StepFunctionsStack(stack, testProps);

		// Assert
		const template = Template.fromStack(sut);
		template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
			DefinitionString: JSON.stringify({
				StartAt: "InvokeLambda",
				States: {
					InvokeLambda: {
						Type: "Task",
						Resource: staticFunctionArn,
						End: true,
					},
				},
			}),
			StateMachineType: "STANDARD",
		});
	});

	test("Should_CreateScheduledRule_When_StackIsSynthesized", () => {
		// Arrange
		const stack = new Stack(new App(), "StepFunctionsTest-ScheduleRule", {
			env,
		});

		// Act
		const sut = new StepFunctionsStack(stack, testProps);

		// Assert
		const template = Template.fromStack(sut);
		template.hasResourceProperties("AWS::Events::Rule", {
			ScheduleExpression: `rate(${testProps.scheduleMinutes} minutes)`,
		});
	});
});

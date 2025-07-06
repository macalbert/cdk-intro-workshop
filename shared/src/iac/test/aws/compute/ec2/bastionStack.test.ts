import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import type { Construct } from "constructs";
import {
	WindowsBastionStack,
	type WindowsBastionStackProps,
} from "../../../../src/aws/compute/ec2/bastionStack";
import { AppEnvironment } from "../../../../src/config/env/appEnvironment";

describe("WindowsBastionStack", () => {
	function createBastion(app: Construct): WindowsBastionStackProps {
		return {
			name: "WindowsBastionStack",
			githubRepo: "shared-test",
			stackName: "shared",
			envName: AppEnvironment.Test,
			vpc: new Vpc(app, "vpc"),
		};
	}

	test("Should_MatchSnapshot_When_WindowsBastionStackIsCreated", () => {
		// Arrange
		const stack = new Stack(undefined, "WindowsBastionStackTest");
		const bastionProps = createBastion(stack);

		// Act
		const bastionStack = new WindowsBastionStack(stack, bastionProps);

		// Assert
		const template = Template.fromStack(bastionStack);
		expect(template.toJSON()).toMatchSnapshot("WindowsBastionStackTest");
	});

	test("Should_CreateResources_When_WindowsBastionStackIsCreated", () => {
		// Arrange
		const stack = new Stack(undefined, "WindowsBastionStackTest");
		const bastionProps = createBastion(stack);

		// Act
		const bastionStack = new WindowsBastionStack(stack, bastionProps);

		// Assert
		const template = Template.fromStack(bastionStack);
		template.resourceCountIs("AWS::EC2::Instance", 1);
		template.resourceCountIs("AWS::EC2::SecurityGroup", 1);
	});
});

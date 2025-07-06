import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import {
	NetworkLoadBalancerStack,
	type NetworkLoadBalancerStackProps,
} from "../../../src/aws/network/networkLoadBalancerStack";
import { AppEnvironment } from "../../../src/config/env/appEnvironment";

describe("NetworkLoadBalancerStack", () => {
	const env = {
		account: "account",
		region: "eu-west-1",
	};

	test("Should_CreateNewNetworkLoadBalancer_When_StackIsCalled", () => {
		// Arrange
		const stack = new Stack(new App(), "networkLoadBalancerStackTest", {
			env: env,
		});
		const props = createNetworkLoadBalancerStackProps(stack);

		// Act
		const actual = new NetworkLoadBalancerStack(stack, props);

		// Assert
		const template = Template.fromStack(actual).toJSON();
		expect(template).toMatchSnapshot("networkLoadBalancerStackTest");
	});

	function createNetworkLoadBalancerStackProps(
		app: Stack,
	): NetworkLoadBalancerStackProps {
		return {
			env: env,
			vpc: new Vpc(app, "vpc"),
			name: "GatewayApiStack",
			envName: AppEnvironment.Test,
			githubRepo: "test",
			stackName: `test-apigateway`,
			domain: "domain.test",
			subdomain: "api",
			certificateArn: `arn:aws:acm:somethingarn`,
		};
	}
});

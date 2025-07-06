import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import {
	ApiGatewayEcsStack,
	type ApiGatewayEcsStackProps,
} from "../../../src/aws/network/apigatewayEcsStack";
import { AppEnvironment } from "../../../src/config/env/appEnvironment";

describe("ApigatewayStack", () => {
	const env = {
		account: "account",
		region: "eu-west-1",
	};

	test("Should_CreateNewApiGateway_When_StackIsCalled", () => {
		// Arrange
		const stack = new Stack(new App(), "apigatewayEcsStacktest", {
			env: env,
		});
		const props = createApigatewayEcsStackProps();

		// Act
		const actual = new ApiGatewayEcsStack(stack, props);

		// Assert
		const template = Template.fromStack(actual).toJSON();

		for (const key in template.Resources) {
			const resource = template.Resources[key];

			if (
				typeof key === "string" &&
				key.startsWith("LambdaRestApitestapigatewayDeployment")
			) {
				delete template.Resources[key];
			}
			if (resource.Properties.DeploymentId?.Ref) {
				delete resource.Properties.DeploymentId.Ref;
			}
		}

		expect(template).toMatchSnapshot("apigatewayEcsStacktest");
	});

	function createApigatewayEcsStackProps(): ApiGatewayEcsStackProps {
		return {
			env: env,
			subdomain: "shared-api-test",
			name: "GatewayApiStack",
			envName: AppEnvironment.Test,
			githubRepo: "test",
			stackName: `test-apigateway`,
			loadBalancerArn: `arn:aws:elasticloadbalancing:${env.region}:${env.account}:loadbalancer/somePath`,
			domain: "some.test",
			certificateArn: `arn:aws:acm:us-east-1:${env.account}:certificate/someId`,
		};
	}
});

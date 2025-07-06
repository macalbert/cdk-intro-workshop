import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { DockerImageCode, DockerImageFunction } from "aws-cdk-lib/aws-lambda";
import {
	ApiGatewayStack,
	type ApiGatewayStackProps,
} from "../../../src/aws/network/apigatewayStack";
import { AppEnvironment } from "../../../src/config/env/appEnvironment";

describe("ApigatewayStack", () => {
	const env = {
		account: "account",
		region: "eu-west-1",
	};

	test("Should_CreateNewApiGateway_When_StackIsCalled", () => {
		// Arrange
		const stack = new Stack(new App(), "apigatewaystacktest", { env: env });
		const props = createApigatewayStackProps(stack);

		// Act
		const actual = new ApiGatewayStack(stack, props);

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

		expect(template).toMatchSnapshot("apigatewaystacktest");
	});

	function createApigatewayStackProps(app: Stack): ApiGatewayStackProps {
		return {
			env: env,
			subdomain: "shared-api-test",
			name: "GatewayApiStack",
			envName: AppEnvironment.Test,
			githubRepo: "test",
			lambdaFunction: new DockerImageFunction(app, "test-apigateway-function", {
				code: DockerImageCode.fromImageAsset("./test/aws/compute/lambda"),
			}),
			stackName: `test-apigateway`,
			certificateArn: `arn:aws:acm:us-east-1:${env.account}:certificate/someid`,
			domain: "test.com",
		};
	}
});

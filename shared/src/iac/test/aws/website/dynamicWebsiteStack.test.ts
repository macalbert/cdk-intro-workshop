import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import {
	DynamicWebsiteStack,
	type DynamicWebsiteStackProps,
} from "../../../src/aws/website/dynamicWebsiteStack";
import { AppEnvironment } from "../../../src/config/env/appEnvironment";

describe("DynamicWebsiteStack", () => {
	const env = {
		account: "account",
		region: "us-east-1",
	};

	test("Should_CreateLambdaAndApiGateway_When_StackIsCreated", () => {
		// Arrange
		const stack = new Stack(new App(), "dynamicwebsitestack", { env: env });
		const props = createDynamicWebsiteStackProps(stack);

		// Act
		const actual = new DynamicWebsiteStack(stack, props);

		// Assert
		const template = Template.fromStack(actual).toJSON();

		// Filter out deployment resources which have random IDs
		for (const key in template.Resources) {
			const resource = template.Resources[key];

			if (
				typeof key === "string" &&
				key.startsWith("SsrRestApidynamicwebsitestackDeployment")
			) {
				delete template.Resources[key];
			}
			if (resource.Properties?.DeploymentId?.Ref) {
				resource.Properties.DeploymentId.Ref = undefined;
			}

			// Normalize container image hash in ImageUri to make tests deterministic
			if (resource.Properties?.Code?.ImageUri?.["Fn::Sub"]) {
				// Replace the changing hash with a fixed value for snapshot testing
				resource.Properties.Code.ImageUri["Fn::Sub"] =
					resource.Properties.Code.ImageUri["Fn::Sub"].replace(
						/cdk-hnb659fds-container-assets-account-us-east-1:[a-f0-9]{64}/,
						"cdk-hnb659fds-container-assets-account-us-east-1:HASH-NORMALIZED-FOR-TESTING",
					);
			}
		}

		expect(template).toMatchSnapshot("dynamicwebsitestacktest");
	});

	test("Should_CreateProperLambdaConfiguration_When_StackIsCreated", () => {
		// Arrange
		const stack = new Stack(new App(), "dynamicwebsitestack", { env: env });
		const props = createDynamicWebsiteStackProps(stack);

		// Act
		const actual = new DynamicWebsiteStack(stack, props);

		// Assert
		const template = Template.fromStack(actual);

		// Verify Lambda function configuration
		template.hasResourceProperties("AWS::Lambda::Function", {
			FunctionName: `${props.subdomain}-ssr-${props.envName}`.toLowerCase(),
			MemorySize: props.memorySize,
			Timeout: props.timeoutSeconds,
			Environment: {
				Variables: {
					NODE_ENV:
						props.envName === AppEnvironment.Production
							? "production"
							: "development",
				},
			},
		});

		// Verify API Gateway integration
		template.hasResourceProperties("AWS::ApiGateway::RestApi", {
			Name: `SsrRestApi-${props.stackName}`,
			BinaryMediaTypes: ["*/*"],
		});

		// Verify Route53 record for custom domain
		template.hasResourceProperties("AWS::Route53::RecordSet", {
			Name: `${props.subdomain}.${props.domainName}.`,
			Type: "A",
		});

		// Verify security group created with proper outbound rules
		template.hasResourceProperties("AWS::EC2::SecurityGroup", {
			SecurityGroupEgress: [
				{
					CidrIp: "0.0.0.0/0",
					Description: "Allow HTTPS outbound",
					FromPort: 443,
					IpProtocol: "tcp",
					ToPort: 443,
				},
				{
					CidrIp: "0.0.0.0/0",
					Description: "Allow HTTP outbound",
					FromPort: 80,
					IpProtocol: "tcp",
					ToPort: 80,
				},
			],
		});
	});

	function createDynamicWebsiteStackProps(
		app: Stack,
	): DynamicWebsiteStackProps {
		return {
			env: env,
			subdomain: "website-test",
			name: "DynamicWebsiteStack",
			envName: AppEnvironment.Test,
			githubRepo: "test",
			domainName: "example.com",
			pathDockerFile: "./test/aws/website",
			dockerfile: "Dockerfile",
			certificateArn: `arn:aws:acm:us-east-1:${env.account}:certificate/someid`,
			hostedZoneId: "Z1234567890ABC",
			stackName: "test-dynamic-website",
			vpc: new Vpc(app, "vpc"),
			memorySize: 512,
			timeoutSeconds: 30,
			environmentVariables: {
				TEST_VAR: "test-value",
			},
		};
	}
});

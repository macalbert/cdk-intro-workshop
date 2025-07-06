import { App, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import {
	PipelineStack,
	type PipelineStackProps,
} from "../../../src/aws/developerTools/codepipeline/pipelineStack";
import { AppEnvironment } from "../../../src/config/env/appEnvironment";

describe("PipelineStack", () => {
	const env = {
		account: "account",
		region: "eu-west-1",
	};

	test("Should_CreatePipelineStack_When_StackIsCalled", () => {
		// Arrange
		const stack = new Stack(new App(), "pipelineStackTest", { env: env });
		const props = createPipelineStackProps(stack);

		// Act
		const actual = new PipelineStack(stack, props);

		// Assert
		const template = Template.fromStack(actual);
		expect(template.toJSON()).toMatchSnapshot("pipelineStackTest");
	});

	test("Should_CreatePipelineWithFilteredPathsStack_When_StackIsCalled", () => {
		// Arrange
		const stack = new Stack(new App(), "pipelineWithFilterStackTest", {
			env: env,
		});
		const props = createPipelineStackProps(stack);
		props.filterPaths = ["some/path"];
		props.envName = AppEnvironment.Production;

		// Act
		const actual = new PipelineStack(stack, props);

		// Assert
		const template = Template.fromStack(actual);
		expect(template.toJSON()).toMatchSnapshot("pipelineWithFilterStackTest");
	});

	test("Should_CreatePipelineWithManualApproval_When_StackIsCalled", () => {
		// Arrange
		const stack = new Stack(new App(), "pipelineWithFilterStackTest", {
			env: env,
		});
		const props = createPipelineStackProps(stack);
		props.manualApproval = true;

		// Act
		const actual = new PipelineStack(stack, props);

		// Assert
		const template = Template.fromStack(actual);
		expect(template.toJSON()).toMatchSnapshot("pipelineWithManualApproval");
	});

	function createPipelineStackProps(app: Stack): PipelineStackProps {
		return {
			name: "FrontendPipelineStack",
			branch: "main",
			githubOwner: "owner",
			githubRepo: "test",
			envName: AppEnvironment.Test,
			secretTokenArn: `arn:aws:secretsmanager:${env.region}:${env.account}:secret:github-token`,
			deployBuildSpec: [`path/build-pipeline.yml`],
			testBuildSpec: [`path/test-pipeline.yml`],
			testProjectName: "project-test",
			vpc: new Vpc(app, "vpc"),
			env: env,
			environment: {
				SOME_KEY: {
					value: "https://some-url-for-test",
				},
			},
			bucketRemovalPolicy: RemovalPolicy.DESTROY,
			domain: "m47-test",
			stackName: "pipeline-stack",
		};
	}
});

import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import {
	StaticWebsiteStack,
	type StaticWebsiteStackProps,
} from "../../../src/aws/website/staticWebsiteStack";
import { AppEnvironment } from "../../../src/config/env/appEnvironment";

describe("Static website Stack", () => {
	const env = {
		account: "account",
		region: "eu-west-1",
	};

	test("Should_CreateWebsite_When_StackIsCalled", () => {
		// Arrange
		const stack = new Stack(new App(), "staticWebsiteStackTest", {
			env: env,
		});
		const props = createStaticWebsiteStackProps();

		// Act
		const actual = new StaticWebsiteStack(stack, props);

		// Assert
		const template = Template.fromStack(actual).toJSON();

		for (const key in template.Resources) {
			const resource = template.Resources[key];
			if (resource.Properties.SourceObjectKeys) {
				delete resource.Properties.SourceObjectKeys;
			}
			if (resource.Properties.Content?.S3Key) {
				delete resource.Properties.Content.S3Key;
			}
			if (resource.Properties.Code?.S3Key) {
				delete resource.Properties.Code.S3Key;
			}
		}

		expect(template).toMatchSnapshot("staticWebsiteStackTest");
	});

	function createStaticWebsiteStackProps(): StaticWebsiteStackProps {
		return {
			env: env,
			name: "websitetest",
			recordName: `test`,
			domainName: "domain.com",
			distFolderPath: ".",
			certificateArn: `arn:aws:acm:us-east-1:${env.account}:certificate/some-guid`,
			hostedZoneId: "123456789",
			envName: AppEnvironment.Test,
			githubRepo: "test-website",
			stackName: `test-web-app`,
		};
	}
});

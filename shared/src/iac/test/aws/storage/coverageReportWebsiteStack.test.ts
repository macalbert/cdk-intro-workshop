import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import {
	CoverageReportWebsiteStack,
	type CoverageReportWebsiteStackProps,
} from "../../../src/aws/storage/coverageReportWebsiteStack";
import { AppEnvironment } from "../../../src/config/env/appEnvironment";

describe("CoverageReportWebsiteStack", () => {
	const env = {
		account: "account",
		region: "eu-west-1",
	};

	test("Should_CreateCoverageReportWebsite_When_StackIsCalled", () => {
		// Arrange
		const stack = new Stack(new App(), "coverageReportWebsiteStack", {
			env: env,
		});
		const props = createCoverageReportWebsiteStackProps();

		// Act
		const actual = new CoverageReportWebsiteStack(stack, props);

		// Assert
		const template = Template.fromStack(actual);
		expect(template.toJSON()).toMatchSnapshot("apigatewaystacktest");
		template.hasResourceProperties("AWS::S3::Bucket", {
			BucketName: props.bucketName,
		});
	});

	function createCoverageReportWebsiteStackProps(): CoverageReportWebsiteStackProps {
		return {
			env: env,
			bucketName: "m47-coverage-report",
			subdomainName: "coverage-report.test.com",
			certificateArn: "arn:aws:acm:us-east-1:accountid:certificate/someid",
			hostedZoneId: "someId",
			githubRepo: "Test",
			envName: AppEnvironment.Production,
			name: "test-CoverageReport",
			stackName: "test-CoverageReportStack",
			domain: "test.net",
		};
	}
});

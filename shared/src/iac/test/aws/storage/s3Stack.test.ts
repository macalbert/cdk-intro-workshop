import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { S3Stack, type S3StackProps } from "../../../src/aws/storage/s3Stack";
import { AppEnvironment } from "../../../src/config/env/appEnvironment";

describe("S3Stack", () => {
	const env = {
		account: "account",
		region: "eu-west-1",
	};

	test("Should_CreateBucket_When_StackIsCalled", () => {
		// Arrange
		const stack = new Stack(new App(), "s3Stack", {
			env: env,
		});
		const props = createS3StackProps();

		// Act
		const actual = new S3Stack(stack, props);

		// Assert
		const template = Template.fromStack(actual);
		expect(template.toJSON()).toMatchSnapshot("s3Stack");
	});

	function createS3StackProps(): S3StackProps {
		return {
			env: env,
			bucketName: "bucket-test",
			githubRepo: "Test",
			envName: AppEnvironment.Production,
			name: "test-CoverageReport",
			stackName: "test-CoverageReportStack",
		};
	}
});

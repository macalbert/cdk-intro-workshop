import { App, Stack } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Template } from "aws-cdk-lib/assertions";
import { ProductionBackend } from "../lib/config/env/productionBackend";
import { ProductionShared } from "../lib/config/env/productionShared";

describe("Test Stack", () => {
    const env = {
        account: "account-id",
        region: "eu-west-1",
    };

    test("Should_CreateCoreBackendStack_When_BuildIsCalled", () => {
        // Arrange
        const stack = new Stack(new App(), "backend", { env: env });

        const backend = new ProductionBackend({
            githubRepo: "githubRepo",
            scope: stack,
            stackName: "stackName",
            env: env,
            branch: "branch",
            vpc: new Vpc(stack, "vpc"),
            subdomain: "subdomain",
            clusterName: "clusterName",
            serviceName: "serviceName",
            exposedPort: 8000,
            sourceCodePath: "./test/",
            dockerfileApi: "Dockerfile",
        });

        // Act
        const actual = backend.build();

        // Assert
        for (const stack of actual) {
            const template = Template.fromStack(stack).toJSON();

            for (const key in template.Resources) {
                const resource = template.Resources[key];

                if (resource.Properties.Code?.ImageUri) {
                    resource.Properties.Code.ImageUri = undefined;
                }
                if (resource.Properties.Code?.S3Key) {
                    resource.Properties.Code.S3Key = undefined;
                }

                if (resource.Properties.Content?.S3Key) {
                    resource.Properties.Content.S3Key = undefined;
                }

                if (resource.Properties.ContainerDefinitions) {
                    for (const container of resource.Properties
                        .ContainerDefinitions) {
                        if (container.Image) {
                            container.Image = undefined;
                        }
                    }
                }

                if (
                    typeof key === "string" &&
                    key.startsWith("LambdaRestApiCoreStackApiGatewayDeployment")
                ) {
                    template.Resources[key] = undefined;
                }

                if (resource.Properties.DeploymentId?.Ref) {
                    resource.Properties.DeploymentId.Ref = undefined;
                }
            }

            expect(template).toMatchSnapshot(`backend_${stack.stackName}`);
        }
    });

    test("Should_CreateCoreSharedStack_When_BuildIsCalled", () => {
        // Arrange
        const stack = new Stack(new App(), "shared", { env: env });

        const shared = new ProductionShared({
            githubRepo: "githubRepo",
            stackName: "stackName",
            scope: stack,
            env: env,
            branch: "branch",
            vpc: new Vpc(stack, "vpc"),
            subdomain: "subdomain",
        });

        // Act
        const actual = shared.build();

        // Assert
        for (const stack of actual) {
            const template = Template.fromStack(stack).toJSON();
            expect(template).toMatchSnapshot(`shared_${stack.stackName}`);
        }
    });
});

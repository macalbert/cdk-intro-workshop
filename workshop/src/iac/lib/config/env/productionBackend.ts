import {
    ApiGatewayStack,
    type ApiGatewayStackProps,
    AppEnvironment,
    ApiLambdaStack,
    type ApiLambdaStackProps,
    S3Stack,
    type S3StackProps,
    StackBuildPart,
    type StackBuildProps,
} from "@m47/shared-iac";
import { type Stack } from "aws-cdk-lib";
import { SubnetType } from "aws-cdk-lib/aws-ec2";
import type { IFunction } from "aws-cdk-lib/aws-lambda";

export interface ProductionBackendProps extends StackBuildProps {
    clusterName: string;
    serviceName: string;
    exposedPort: number;
    sourceCodePath: string;
    dockerfileApi: string;
}

export class ProductionBackend extends StackBuildPart {
    props: ProductionBackendProps;

    environment = AppEnvironment.Production;

    constructor(buildProps: ProductionBackendProps) {
        super(buildProps);

        this.props = buildProps;
        this.props.githubRepo = this.formatRepoNameForCloudFormation();
    }

    build(): Stack[] {
        
        const apiLambdaStack = this.createApiLambdaStack(
            "ApiLambda",
            this.props.dockerfileApi,
            "api",
        );

        const apiGatewayStack = this.createApiGateway(
            apiLambdaStack.lambdaFunction,
            "ApiGateway",
            "api-cdk-workshop",
        );

        return [
            apiLambdaStack,
            apiGatewayStack,
        ];
    }

    private createApiLambdaStack(
        name: string,
        dockerfile: string,
        subdomain: string,
    ): ApiLambdaStack {
        const lambdaExportProps: ApiLambdaStackProps = {
            name: name,
            githubRepo: this.props.githubRepo,
            pathDockerFile: this.props.sourceCodePath,
            env: this.props.env,
            vpc: this.props.vpc,
            envName: AppEnvironment.Production,
            timeoutSeconds: 29,
            memorySizeMbs: 1024,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            stackName: `${this.props.githubRepo}-${name}`,
            functionName: `${this.props.githubRepo}-${subdomain}`.toLowerCase(),
            dockerFile: dockerfile,
        };

        const stack = new ApiLambdaStack(this.props.scope, lambdaExportProps);

        return stack;
    }

    private createApiGateway(
        lambdaFunction: IFunction,
        name: string,
        subdomain: string,
    ): ApiGatewayStack {
        const apiProps: ApiGatewayStackProps = {
            env: this.props.env,
            name: name,
            envName: AppEnvironment.Production,
            lambdaFunction: lambdaFunction,
            stackName: `${this.props.githubRepo}-${name}`,
            subdomain: subdomain,
            githubRepo: this.props.githubRepo,
            certificateArn: `arn:aws:acm:us-east-1:${this.props.env.account}:certificate/be63062d-5316-47af-9f94-819c1dc02853`,
            domain: "m47.io",
        };

        return new ApiGatewayStack(this.props.scope, apiProps);
    }
}

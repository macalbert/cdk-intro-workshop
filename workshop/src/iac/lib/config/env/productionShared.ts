import {
    AppEnvironment,
    PipelineStack,
    type PipelineStackProps,
    RdsStack,
    type RdsStackProps,
    StackBuildPart,
    type StackBuildProps,
    WindowsBastionStack,
    type WindowsBastionStackProps,
} from "@m47/shared-iac";
import { RemovalPolicy, type Stack } from "aws-cdk-lib";
import { InstanceType, InstanceClass, InstanceSize } from "aws-cdk-lib/aws-ec2";
import { PostgresEngineVersion } from "aws-cdk-lib/aws-rds";

export class ProductionShared extends StackBuildPart {
    props: StackBuildProps;

    constructor(buildProps: StackBuildProps) {
        super(buildProps);

        this.props = buildProps;
    }

    build(): Stack[] {
        const pipelineStack = this.createPipelineStack();
        const rdsStack = this.createRdsStack();
        const createBastionStack = this.createBastionStack();

        return [
            rdsStack,
            pipelineStack,
            createBastionStack,
        ];
    }

    private createPipelineStack(): PipelineStack {
        const pipeline: PipelineStackProps = {
            name: "Pipeline",
            branch: this.props.branch,
            githubRepo: this.props.githubRepo,
            envName: AppEnvironment.Production,
            secretTokenArn: `arn:aws:secretsmanager:${this.props.env.region}:${this.props.env.account}:secret:github-access-token-secret-dth2kY`,
            testBuildSpec: [
                "workshop/src/iac/buildspecs/test/iac.yml",
                "workshop/src/iac/buildspecs/test/backend.yml",
            ],
            deployBuildSpec: [
                "workshop/src/iac/buildspecs/production/backendApi.yml",
            ],
            testProjectName: `${this.props.githubRepo}-Tests`,
            vpc: this.props.vpc,
            env: this.props.env,
            bucketRemovalPolicy: RemovalPolicy.DESTROY,
            domain: "workshop.com",
            stackName: `${this.formatRepoNameForCloudFormation()}-CodePipeline`,
            manualApproval: false,
            shouldCreateNewSlackChannel: false,
        };

        return new PipelineStack(this.props.scope, pipeline);
    }

    private createRdsStack(): RdsStack {
        const props: RdsStackProps = {
            env: this.props.env,
            vpc: this.props.vpc,
            databaseName: "workshop",
            databaseUserName: "masteruser",
            backupRetentionDays: 14,
            storageSizeGb: 100,
            monitoringIntervalSeconds: 60,
            engineVersion: PostgresEngineVersion.VER_17_4,
            instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
            githubRepo: this.props.githubRepo,
            envName: AppEnvironment.Production,
            stackName: `${this.formatRepoNameForCloudFormation()}-rds`,
            name: "RdsPostgres",
        };

        return new RdsStack(this.props.scope, props);
    }

    private createBastionStack(): WindowsBastionStack {
        const windowsBastionStackProps: WindowsBastionStackProps = {
            vpc: this.props.vpc,
            githubRepo: this.props.githubRepo,
            envName: AppEnvironment.Production,
            name: "bastion",
            stackName: `${this.formatRepoNameForCloudFormation()}-Bastion`,
            env: this.props.env,
        };

        return new WindowsBastionStack(
            this.props.scope,
            windowsBastionStackProps,
        );
    }
}

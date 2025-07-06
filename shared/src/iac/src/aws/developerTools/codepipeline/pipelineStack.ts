import * as path from "node:path";
import {
    Duration,
    type Environment,
    RemovalPolicy,
    SecretValue,
    aws_codebuild,
} from "aws-cdk-lib";
import {
    LoggingLevel,
    SlackChannelConfiguration,
} from "aws-cdk-lib/aws-chatbot";
import {
    BuildSpec,
    LinuxBuildImage,
    PipelineProject,
} from "aws-cdk-lib/aws-codebuild";
import {
    Artifact,
    Pipeline,
    PipelineType,
    type StageProps,
} from "aws-cdk-lib/aws-codepipeline";
import {
    CodeBuildAction,
    GitHubSourceAction,
    GitHubTrigger,
    ManualApprovalAction,
} from "aws-cdk-lib/aws-codepipeline-actions";
import { DetailType } from "aws-cdk-lib/aws-codestarnotifications";
import type { IVpc } from "aws-cdk-lib/aws-ec2";
import {
    ArnPrincipal,
    PolicyDocument,
    PolicyStatement,
    Role,
    ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Key } from "aws-cdk-lib/aws-kms";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import type { Construct } from "constructs";
import type { AppEnvironment } from "../../../config/env/appEnvironment";
import { M47Stack, type M47StackProps } from "../../../config/shared/m47Stack";
import { formatRepoNameForCloudFormation } from "../../../utils/cloudFormationUtils";

export interface PipelineStackProps extends M47StackProps {
    branch: string;
    githubRepo: string;
    githubOwner: string;
    envName: AppEnvironment;
    domain: string;
    secretTokenArn: string;
    deployBuildSpec: string[];
    testBuildSpec: string[];
    vpc: IVpc;
    testProjectName: string;
    bucketRemovalPolicy: RemovalPolicy;
    environment?: object;
    filterPaths?: string[];
    manualApproval?: boolean;
    shouldCreateNewSlackChannel?: boolean;
}

/**
 * PipelineStack defines a complete CI/CD pipeline using AWS CodePipeline, CodeBuild, and CodeDeploy.
 *
 * The stack creates source actions from GitHub, test and deploy actions based on provided buildspec files,
 * and configures notifications for pipeline state changes. It also creates the necessary IAM roles for pipeline,
 * test, and deploy stages, and sets up Slack and email notifications based on manual approval settings.
 *
 * @example
 * const pipelineStack = new PipelineStack(app, {
 *   branch: "main",
 *   githubRepo: "my-repo",
 *   envName: AppEnvironment.PROD,
 *   domain: "example.com",
 *   secretTokenArn: "arn:aws:secretsmanager:...",
 *   deployBuildSpec: ["deploy/buildspec.yml"],
 *   testBuildSpec: ["test/buildspec.yml"],
 *   vpc: myVpc,
 *   testProjectName: "MyTestProject",
 *   bucketRemovalPolicy: RemovalPolicy.DESTROY,
 *   environment: { CUSTOM_VAR: { value: "value" } },
 *   filterPaths: ["src/**"],
 *   manualApproval: true,
 *   shouldCreateNewSlackChannel: false,
 *   // plus additional M47StackProps...
 * });
 */
export class PipelineStack extends M47Stack {

    /**
     * Constructs a new instance of PipelineStack.
     *
     * The constructor sets up the pipeline by creating the source, test, deploy stages, and notifications.
     * It creates separate IAM roles for the pipeline, test, and deploy actions, and uses a pre-existing artifact bucket.
     *
     * @param scope - The scope in which this stack is defined.
     * @param props - The properties for configuring the pipeline.
     */
    constructor(scope: Construct, props: PipelineStackProps) {
        super(scope, props);

        const pipelineRole = this.createPipelineRole(props, "pipeline");

        const pipelineRoleTest = this.createPipelineRole(
            props,
            "test",
            new ArnPrincipal(pipelineRole.roleArn),
        );
        const pipelineRoleDeploy = this.createPipelineRole(
            props,
            "deploy",
            new ArnPrincipal(pipelineRole.roleArn),
        );

        const sourceOutput = new Artifact();

        const sourceAction = new GitHubSourceAction({
            actionName:
                `checkout-${props.envName}-${props.githubRepo}`.toLowerCase(),
            owner: props.githubOwner,
            repo: props.githubRepo,
            branch: props.branch,
            output: sourceOutput,
            oauthToken: SecretValue.secretsManager(props.secretTokenArn),
            trigger: GitHubTrigger.WEBHOOK,
        });

        const testActions = props.testBuildSpec.map((buildspec) =>
            this.createTestAction(
                sourceOutput,
                props,
                buildspec,
                pipelineRoleTest,
            ),
        );

        const deployActions = props.deployBuildSpec.map((buildspec) =>
            this.createDeployAction(
                sourceOutput,
                props,
                buildspec,
                pipelineRoleDeploy,
            ),
        );

        const stages: StageProps[] = this.createStages(
            sourceAction,
            testActions,
            props,
            pipelineRole,
            deployActions,
        );

        const artifactBucket = Bucket.fromBucketName(
            this,
            "workshop-codepipeline-artifact",
            "workshop-codepipeline-artifact",
        );

        const pipeline = new Pipeline(this, "Pipeline", {
            pipelineType: PipelineType.V2,
            role: pipelineRole,
            pipelineName: `${props.githubRepo}-${props.envName}`.toLowerCase(),
            stages: stages,
            artifactBucket: artifactBucket,
        });

        this.createNotifications(props, pipeline);
    }

    /**
     * Configures notifications for pipeline state changes and manual approvals.
     *
     * This method sets up an SNS topic for chatbot notifications and creates Slack channel configurations.
     * If manual approval is enabled, it also creates an email topic subscription for manual approval notifications.
     *
     * @param props - The pipeline properties.
     * @param pipeline - The CodePipeline instance.
     */
    private createNotifications(props: PipelineStackProps, pipeline: Pipeline) {
        if (props.shouldCreateNewSlackChannel === true) {
            const chatbotTopic = new Topic(
                this,
                `${props.githubRepo}_chatbotSnsTopic_${props.envName}`,
                {
                    displayName: "Chatbot SNS Topic",
                    masterKey: new Key(
                        this,
                        `Key-${props.githubRepo}_chatbotSnsTopic_${props.envName}`.toLowerCase(),
                    ),
                },
            );
            const chatbotTarget = this.createSlackChannelConfiguration(
                chatbotTopic,
                props,
            );

            pipeline.notifyOnExecutionStateChange(
                `${props.githubRepo}-ActionStateChange-${props.envName}`,
                chatbotTarget,
                {
                    detailType: DetailType.BASIC,
                    notificationRuleName:
                        `${props.githubRepo}-ActionChanged-${props.envName}`.toLowerCase(),
                },
            );

            if (props.manualApproval === true) {
                pipeline.notifyOnAnyManualApprovalStateChange(
                    `${props.githubRepo}_ManualApprovealEmail_${props.envName}`,
                    chatbotTarget,
                    {
                        detailType: DetailType.FULL,
                        notificationRuleName:
                            `${props.githubRepo}-ManualApproval-${props.envName}`.toLowerCase(),
                    },
                );

                const emailTopic = new Topic(
                    this,
                    `${props.githubRepo}_ManualApprovealEmail_${props.envName}`,
                    {
                        displayName: `${props.githubRepo} - Manual Approval`,
                        masterKey: new Key(
                            this,
                            `Key-${props.githubRepo}-ManualApprovealEmail-${props.envName}`.toLowerCase(),
                        ),
                    },
                );
                emailTopic.addSubscription(
                    new EmailSubscription("developers@m47labs.com"),
                );

                pipeline.notifyOnAnyManualApprovalStateChange(
                    `${props.githubRepo}-NotifyManualApproval-${props.envName}`,
                    emailTopic,
                    {
                        detailType: DetailType.FULL,
                        notificationRuleName:
                            `${props.githubRepo}-ManualApproval-email-${props.envName}`.toLowerCase(),
                    },
                );
            }
        }
    }

    /**
     * Creates a Slack channel configuration for pipeline notifications.
     *
     * If the property to create a new Slack channel is true, a new SlackChannelConfiguration is created.
     * Otherwise, an existing configuration is imported by ARN.
     *
     * @param snsTopic - The SNS topic used for notifications.
     * @param props - The pipeline properties.
     * @returns The SlackChannelConfiguration instance.
     */
    private createSlackChannelConfiguration(
        snsTopic: Topic,
        props: PipelineStackProps,
    ): SlackChannelConfiguration {
        if (props.shouldCreateNewSlackChannel) {
            const slackConfig = new SlackChannelConfiguration(
                this,
                "SlackConfig",
                {
                    slackChannelConfigurationName: "SlackConfig",
                    slackWorkspaceId: "T98UH2NLT",
                    slackChannelId: "CT9FRTMEH",
                    logRetention: RetentionDays.ONE_YEAR,
                    loggingLevel: LoggingLevel.NONE,
                    notificationTopics: [snsTopic],
                },
            );
            slackConfig.applyRemovalPolicy(RemovalPolicy.DESTROY);

            return slackConfig;
        }

        const slackConfig =
            SlackChannelConfiguration.fromSlackChannelConfigurationArn(
                this,
                "SlackConfig",
                `arn:aws:chatbot::${props.env?.account}:chat-configuration/slack-channel/SlackConfig`,
            ) as SlackChannelConfiguration;

        return slackConfig;
    }

    /**
     * Creates an IAM role for a specific pipeline component.
     *
     * The role is created with an inline policy document based on the provided domain and environment,
     * and additional assume role permissions for Lambda, CodePipeline, and CodeBuild.
     *
     * @param props - The pipeline properties.
     * @param roleType - A string representing the type of role (e.g., "pipeline", "deploy", or "test").
     * @returns The created IAM role.
     */
    private createPipelineRole(
        props: PipelineStackProps,
        roleType: string,
        additionalPrincipal?: ArnPrincipal,
    ): Role {
        const policyDocument = this.getPolicyDocument(props.domain, props.env);

        const pipelineRole = new Role(this, `Role-${roleType}`, {
            assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
            description: `Role for CD pipeline in repo ${props.githubRepo} (${props.envName})`,
            inlinePolicies: { customApiPolicyDocument: policyDocument },
        });

        pipelineRole.assumeRolePolicy?.addStatements(
            new PolicyStatement({
                principals: [
                    new ServicePrincipal("lambda.amazonaws.com"),
                    new ServicePrincipal("codepipeline.amazonaws.com"),
                    new ServicePrincipal("codebuild.amazonaws.com"),
                ],
                actions: ["sts:AssumeRole"],
            }),
        );

        if (additionalPrincipal) {
            pipelineRole.assumeRolePolicy?.addStatements(
                new PolicyStatement({
                    principals: [additionalPrincipal],
                    actions: ["sts:AssumeRole"],
                }),
            );
        }

        return pipelineRole;
    }

    /**
     * Creates the stages for the CodePipeline.
     *
     * This method defines the stages for source, manual approval (if enabled), test, and deploy actions.
     *
     * @param sourceAction - The GitHub source action.
     * @param testAction - An array of CodeBuild actions for testing.
     * @param props - The pipeline properties.
     * @param pipelineRole - The IAM role for the pipeline.
     * @param deployAction - An array of CodeBuild actions for deployment.
     * @returns An array of StageProps defining the pipeline stages.
     */
    private createStages(
        sourceAction: GitHubSourceAction,
        testAction: CodeBuildAction[],
        props: PipelineStackProps,
        pipelineRole: Role,
        deployAction: CodeBuildAction[],
    ): StageProps[] {
        const stages: StageProps[] = [
            { actions: [sourceAction], stageName: "Source" },
        ];

        if (props.manualApproval) {
            const manualApprovalAction = new ManualApprovalAction({
                actionName:
                    `${props.githubRepo}-ManualApproval-${props.envName}`.toLowerCase(),
                role: pipelineRole,
            });

            stages.push({
                actions: [manualApprovalAction],
                stageName:
                    `${props.githubRepo}-ManualApproval-${props.envName}`.toLowerCase(),
            });
        }

        stages.push({ actions: testAction, stageName: "Test" });
        stages.push({ actions: deployAction, stageName: "Deploy" });

        return stages;
    }

    /**
     * Creates a CodeBuild action for testing.
     *
     * This method creates a PipelineProject for testing using the provided buildspec file.
     * It configures the project environment with a Linux build image and returns a CodeBuildAction.
     *
     * @param sourceOutput - The source artifact from GitHub.
     * @param props - The pipeline properties.
     * @param buildspec - The filename of the test buildspec.
     * @param pipelineRole - The IAM role to use for the test project.
     * @returns The created CodeBuildAction for testing.
     */
    private createTestAction(
        sourceOutput: Artifact,
        props: PipelineStackProps,
        buildspec: string,
        pipelineRole: Role,
    ): CodeBuildAction {
        const fileName = path.parse(path.basename(buildspec)).name;
        const projectName =
            `${fileName}-test-${formatRepoNameForCloudFormation(props.githubRepo)}`.toLowerCase();

        const project = new PipelineProject(this, `Test-${fileName}`, {
            environment: {
                buildImage: LinuxBuildImage.STANDARD_7_0,
                privileged: true,
                computeType: aws_codebuild.ComputeType.LARGE,
            },
            timeout: Duration.minutes(30),
            environmentVariables: {},
            buildSpec: BuildSpec.fromSourceFilename(buildspec),
            role: pipelineRole,
            vpc: props.vpc,
            projectName: projectName,
        });

        return new CodeBuildAction({
            input: sourceOutput,
            actionName: projectName,
            project: project,
            role: pipelineRole,
        });
    }

    /**
     * Creates a CodeBuild action for deployment.
     *
     * This method creates a PipelineProject for deployment using the provided buildspec file.
     * It configures the environment variables and returns a CodeBuildAction for the deployment stage.
     *
     * @param sourceOutput - The source artifact from GitHub.
     * @param props - The pipeline properties.
     * @param buildspec - The filename of the deploy buildspec.
     * @param pipelineRole - The IAM role to use for the deploy project.
     * @returns The created CodeBuildAction for deployment.
     */
    private createDeployAction(
        sourceOutput: Artifact,
        props: PipelineStackProps,
        buildspec: string,
        pipelineRole: Role,
    ): CodeBuildAction {
        const fileName = path.parse(path.basename(buildspec)).name;
        const projectName =
            `${fileName}-deploy-${formatRepoNameForCloudFormation(props.githubRepo)}`.toLowerCase();

        const project = new PipelineProject(this, fileName, {
            environment: {
                buildImage: LinuxBuildImage.STANDARD_7_0,
                privileged: true,
                computeType: aws_codebuild.ComputeType.LARGE,
            },
            timeout: Duration.minutes(60),
            environmentVariables: this.getEnvironmentVariables(props),
            buildSpec: BuildSpec.fromSourceFilename(buildspec),
            role: pipelineRole,
            projectName: projectName,
        });

        return new CodeBuildAction({
            input: sourceOutput,
            actionName: projectName,
            project: project,
            role: pipelineRole,
        });
    }

    /**
     * Retrieves and merges environment variables for the deploy project.
     *
     * By default, it includes ASPNETCORE_ENVIRONMENT set to the environment name.
     * If additional environment variables are provided, they are merged.
     *
     * @param props - The pipeline properties.
     * @returns An object containing the environment variables.
     */
    private getEnvironmentVariables(props: PipelineStackProps) {
        let environmentVariables = {
            ASPNETCORE_ENVIRONMENT: { value: props.envName },
        };

        if (props.environment !== null) {
            environmentVariables = {
                ...props.environment,
                ...{ ASPNETCORE_ENVIRONMENT: { value: props.envName } },
            };
        }

        return environmentVariables;
    }

    /**
     * Constructs a policy document for the pipeline role.
     *
     * The policy document includes permissions for assuming roles, CloudWatch logging,
     * CodeBuild reporting, S3 access, Secrets Manager, SES, KMS, SQS, and SSM.
     *
     * @param domain - The domain for SES email sending.
     * @param env - The AWS environment information.
     * @returns A PolicyDocument object in JSON format.
     */
    private getPolicyDocument(domain: string, env?: Environment) {
        return PolicyDocument.fromJson({
            Version: "2012-10-17",
            Statement: [
                {
                    Action: ["sts:AssumeRole"],
                    Resource: [`arn:aws:iam::${env?.account}:role/*`],
                    Effect: "Allow",
                },
                {
                    Action: [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                    ],
                    Resource: [
                        `arn:aws:logs:${env?.region}:${env?.account}:log-group:*`,
                    ],
                    Effect: "Allow",
                },
                {
                    Action: [
                        "codebuild:BatchPutCodeCoverages",
                        "codebuild:BatchPutTestCases",
                        "codebuild:CreateReport",
                        "codebuild:CreateReportGroup",
                        "codebuild:UpdateReport",
                        "codebuild:StartBuild",
                    ],
                    Resource: `arn:aws:codebuild:${env?.region}:${env?.account}:project/*`,
                    Effect: "Allow",
                },
                {
                    Action: ["s3:GetBucket*", "s3:GetObject*", "s3:List*"],
                    Resource: ["arn:aws:s3:::*"],
                    Effect: "Allow",
                },
                {
                    Action: [
                        "secretsmanager:GetResourcePolicy",
                        "secretsmanager:GetSecretValue",
                        "secretsmanager:DescribeSecret",
                        "secretsmanager:ListSecretVersionIds",
                    ],
                    Resource: ["*"],
                    Effect: "Allow",
                },
                {
                    Action: ["ses:SendEmail"],
                    Resource: [
                        `arn:aws:ses:${env?.region}:${env?.account}:identity/${domain}`,
                    ],
                    Effect: "Allow",
                },
                {
                    Action: [
                        "kms:Decrypt",
                        "kms:DescribeKey",
                        "kms:Encrypt",
                        "kms:GenerateDataKey*",
                        "kms:ReEncrypt*",
                    ],
                    Resource: `arn:aws:kms:${env?.region}:${env?.account}:*`,
                    Effect: "Allow",
                },
                {
                    Action: ["sqs:*"],
                    Resource: `arn:aws:sqs:${env?.region}:${env?.account}:*`,
                    Effect: "Allow",
                },
                {
                    Action: [
                        "ssm:GetParameter",
                        "ssm:GetParameters",
                        "ssm:GetParametersByPath",
                    ],
                    Resource: [
                        `arn:aws:ssm:${env?.region}:${env?.account}:parameter/*`,
                    ],
                    Effect: "Allow",
                },
            ],
        });
    }
}

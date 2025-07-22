#!/usr/bin/env node
import "source-map-support/register";
import { App, type Environment } from "aws-cdk-lib";
import { IacStack, type ModulesPathProps } from "../lib/iacStack";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";

const envFromCli: Environment = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
};

const gitHubRepo = "cdk-intro-workshop";
const vpcId = 'vpc-ee04cd97';
const rootPath = path.join(process.cwd(), "../../../");

const dockerfileApi = path.join(
    rootPath,
    "workshop/src/apps/Minimal.Api/Dockerfile",
);

const modulesPath: ModulesPathProps = {
    absoluteRepoPath: rootPath,
    frontendDistPath: path.join(
        rootPath,
        "workshop/src/apps/frontend/dist",
    ),
    dockerfileApi: "Dockerfile.api"
};

try {
    console.log(
        `\n------[${gitHubRepo}]----------------------------------------------------------------`,
    );
    console.log("\x1b[36m%s\x1b[0m", "🔑 Credentials loaded from AWS CLI:");
    console.log(`${JSON.stringify(envFromCli, null, 2)}\n`);

    CopyDockerfileToRootFolder(dockerfileApi, modulesPath.dockerfileApi);
    DisableBuildxAttestations();

    console.log("Logging in to AWS ECR...");
    if (!process.env.CODEBUILD_BUILD_ID && !process.env.GITHUB_ACTIONS) {
        console.log("Logging in to AWS ECR...");
        const fs = require("node:fs");
        const path = require("node:path");

        const cdkConfig = JSON.parse(
            fs.readFileSync(path.resolve(__dirname, "../cdk.json")),
        );
        const profile = cdkConfig.profile;

        if (profile) {
            execSync(
                `aws ecr get-login-password --region ${envFromCli.region} --profile ${profile} | docker login --username AWS --password-stdin ${envFromCli.account}.dkr.ecr.${envFromCli.region}.amazonaws.com`,
                { stdio: "inherit" },
            );
        }
    }
    const app = new App();

    new IacStack(app, envFromCli, vpcId, gitHubRepo, modulesPath);
    app.synth();
} finally {
    DeleteDockerfile(modulesPath.dockerfileApi);
}

function DisableBuildxAttestations() {
    if (!process.env.BUILDX_NO_DEFAULT_ATTESTATIONS) {
        process.env.BUILDX_NO_DEFAULT_ATTESTATIONS = "1";

        // console.log('\x1b[32m%s\x1b[0m', `\n✅ BUILDX_NO_DEFAULT_ATTESTATIONS is set to ${process.env['BUILDX_NO_DEFAULT_ATTESTATIONS']}`);
        // console.log('\x1b[36m%s\x1b[0m', '  🔗 https://docs.docker.com/build/release-notes/#0100');
        // console.log('\x1b[36m%s\x1b[0m', '  🔗 https://github.com/aws/aws-cdk/issues/31548');
        // console.log('\x1b[36m%s\x1b[0m', '  🔗 https://github.com/docker/buildx/issues/1533');
        // console.log('\x1b[36m%s\x1b[0m', '  🔗 https://docs.docker.com/build/metadata/attestations/\n');
    }
}

function CopyDockerfileToRootFolder(source: string, destination: string) {
    try {
        fs.copyFileSync(source, path.join(rootPath, destination));
    } catch (err) {
        console.error(err);
    }
}

function DeleteDockerfile(dockerFileName: string) {
    try {
        fs.unlinkSync(path.join(rootPath, `/${dockerFileName}`));
    } catch (err) {
        console.error(err);
    }
}

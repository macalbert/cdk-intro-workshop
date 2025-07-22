import type { Environment } from "aws-cdk-lib";
import type { StackBuildPart } from "@m47/shared-iac";
import type { Construct } from "constructs";
import {
    ProductionBackend,
    type ProductionBackendProps,
} from "./config/env/productionBackend";
import { StackBuilder } from "@m47/shared-iac";
import { formatRepoNameForCloudFormation } from "@m47/shared-iac/src/utils/cloudFormationUtils";

export interface ModulesPathProps {
    frontendDistPath: string;
    absoluteRepoPath: string;
    dockerfileApi: string;
}

export class IacStack extends StackBuilder {
    constructor(
        scope: Construct,
        env: Environment,
        vpcId: string,
        githubRepo: string,
        modulesPath: ModulesPathProps,
    ) {
        super(scope, env, githubRepo, vpcId);
        
        const pathEntries = [
            { label: "Repository Root", value: modulesPath.absoluteRepoPath },
            { label: "API Dockerfile", value: modulesPath.dockerfileApi }           
        ];

        this.logModulePathsTable(pathEntries);

        const stackParts: StackBuildPart[] = [
            new ProductionBackend({
                githubRepo: githubRepo,
                stackName: "BackendStack",
                scope: scope,
                env: env,
                branch: this.branchName,
                vpc: this.vpc,
                subdomain: `${formatRepoNameForCloudFormation(githubRepo)}-api`,
                exposedPort: 8000,
                absoluteRepoPath: modulesPath.absoluteRepoPath,
                dockerfileApi: modulesPath.dockerfileApi,
            } as ProductionBackendProps)
        ];

        this.build(stackParts);
    }
    
    private logModulePathsTable(
        pathEntries: Array<{ label: string; value: string }>,
    ) {
        const maxLabelLength = Math.max(
            ...pathEntries.map((entry) => entry.label.length),
        );

        const maxValueLength = Math.max(
            ...pathEntries.map((entry) => entry.value.length),
        );

        const tableWidth = maxLabelLength + maxValueLength + 6;
        const headerTitle = " 📁 Module Paths Configuration ";
        const headerPadding = Math.max(0, tableWidth - headerTitle.length - 2);

        console.log(`\n╭─${headerTitle}${"─".repeat(headerPadding)}╮`);

        pathEntries.forEach(({ label, value }) => {
            const paddedLabel = label.padEnd(maxLabelLength);
            const paddedValue = value.padEnd(maxValueLength);
            console.log(`│ ${paddedLabel} │ ${paddedValue} │`);
        });

        console.log(
            `╰${"─".repeat(maxLabelLength + 2)}┴${"─".repeat(maxValueLength + 2)}╯\n`,
        );
    }
}

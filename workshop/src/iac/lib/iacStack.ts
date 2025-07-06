import type { Environment } from "aws-cdk-lib";
import type { StackBuildPart, StackBuildProps } from "@m47/shared-iac";
import type { Construct } from "constructs";
import {
    ProductionBackend,
    type ProductionBackendProps,
} from "./config/env/productionBackend";
import { ProductionShared } from "./config/env/productionShared";
import { StackBuilder } from "@m47/shared-iac";
import { formatRepoNameForCloudFormation } from "@m47/shared-iac/src/utils/cloudFormationUtils";

export interface ModulesPathProps {
    frontendDistPath: string;
    sourceCodePath: string;
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

        console.log("\n * Folder paths:");
        console.log("   ---------------");
        console.log(`  - sourceCodePath: ${modulesPath.sourceCodePath}`);
        console.log(`  - dockerfileApiName: ${modulesPath.dockerfileApi}`);
        console.log(`  - userShopDistPath: ${modulesPath.frontendDistPath}\n`);

        const stackParts: StackBuildPart[] = [
            new ProductionBackend({
                githubRepo: githubRepo,
                stackName: "BackendStack",
                scope: scope,
                env: env,
                branch: this.branchName,
                vpc: this.vpc,
                subdomain: `${formatRepoNameForCloudFormation(githubRepo)}-api`,
                clusterName: formatRepoNameForCloudFormation(githubRepo),
                exposedPort: 8000,
                sourceCodePath: modulesPath.sourceCodePath,
                dockerfileApi: modulesPath.dockerfileApi,
            } as ProductionBackendProps),
            new ProductionShared({
                githubRepo: githubRepo,
                stackName: "SharedStack",
                scope: scope,
                env: env,
                branch: this.branchName,
                vpc: this.vpc,
                subdomain: "workshop-coverage-report",
            } as StackBuildProps),
        ];

        this.build(stackParts);
    }
}

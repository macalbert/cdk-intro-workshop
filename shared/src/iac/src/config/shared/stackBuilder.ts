import type { Environment } from "aws-cdk-lib";
import type { IVpc } from "aws-cdk-lib/aws-ec2";
import type { Construct, Node } from "constructs";
import type { StackBuildPart } from "./stackBuild";
import { VpcStack } from "./vpcStack";

export abstract class StackBuilder {
    githubRepo: string;
    branchName: string;
    env: Environment;
    vpc: IVpc;

    constructor(
        scope: Construct,
        env: Environment,
        githubRepo: string,
        vpcId: string,
    ) {
        // how to use params
        // cdk deploy name-of-stack -c branch={main}

        this.githubRepo = githubRepo;
        this.branchName = this.getBranch(githubRepo, scope.node);
        this.env = env;
        this.vpc = this.getVpc(scope, vpcId, env);
    }

    public build(stackParts: StackBuildPart[]) {
        console.log("\x1b[36m%s\x1b[0m", "🎯 Requested stacks:");

        for (const stack of stackParts) {
            try {
                stack.build();
            } catch (error: unknown) {
                console.log(error);
                if (typeof error === "object" && error !== null) {
                    if (
                        !error.toString().includes("Error: Cannot find asset")
                    ) {
                        throw error;
                    }
                }
            }
        }
    }

    private getBranch(githubRepo: string, node: Node): string {
        const branchName = node.tryGetContext("branch") ?? "main";

        console.log(
            "\x1b[33m%s\x1b[0m",
            `🔌 Repository source https://github.com/m47ai/${githubRepo}/tree/${branchName}`,
        );

        return branchName;
    }

    private getVpc(scope: Construct, vpcId: string, env?: Environment): IVpc {
        const vpcStack = new VpcStack(scope, { env: env, vpcId: vpcId });
        return vpcStack.vpc;
    }
}

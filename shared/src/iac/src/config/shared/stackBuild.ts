import type { Environment, Stack } from "aws-cdk-lib";
import type { IVpc } from "aws-cdk-lib/aws-ec2";
import type { Construct } from "constructs";
import { formatRepoNameForCloudFormation } from "../../utils/cloudFormationUtils";

export interface StackBuildProps {
    env: Environment;
    githubRepo: string;
    stackName: string;
    scope: Construct;
    branch: string;
    vpc: IVpc;
    subdomain: string;
}

export abstract class StackBuildPart {
    props: StackBuildProps;

    constructor(props: StackBuildProps) {
        this.props = props;
    }

    abstract build(): Stack[];

    /**
     * Returns a formatted repository name that complies with AWS CloudFormation stack naming requirements.
     */
    public formatRepoNameForCloudFormation(): string {
        return formatRepoNameForCloudFormation(this.props.githubRepo);
    }
}

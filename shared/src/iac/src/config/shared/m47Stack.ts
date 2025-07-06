import { Stack, type StackProps, Tags } from "aws-cdk-lib";
import type { Construct, IConstruct } from "constructs";
import type { AppEnvironment } from "../env/appEnvironment";
import { formatRepoNameForCloudFormation } from "../../utils/cloudFormationUtils";

export interface M47StackProps extends StackProps {
    githubRepo: string;
    envName: AppEnvironment;
    name: string;
    stackName: string;
}

export class M47Stack extends Stack {
    props: M47StackProps;

    constructor(scope: Construct, props: M47StackProps) {
        super(scope, getStackName(props), props);

        this.props = props;
    }

    getStackId(): string {
        return getStackName(this.props);
    }

    public addProjectTags(obj: IConstruct, props: M47StackProps) {
        Tags.of(obj).add("StackId", getStackName(props), {
            priority: 300,
        });

        Tags.of(obj).add("Environment", props.envName.valueOf(), {
            priority: 300,
        });

        Tags.of(obj).add("Project", props.githubRepo, {
            priority: 300,
        });
    }

    public toCloudFormation(): string {
        return formatRepoNameForCloudFormation(this.props.githubRepo);
    }
}

function getStackName(props: M47StackProps): string {
    return `m47-${formatRepoNameForCloudFormation(props.githubRepo)}-${props.name}-${props.envName}-stack`.toLowerCase();
}

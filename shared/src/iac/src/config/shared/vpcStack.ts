import { type Environment, Stack, type StackProps } from "aws-cdk-lib";
import { type IVpc, Vpc } from "aws-cdk-lib/aws-ec2";
import type { Construct } from "constructs";

export interface VpcStackProps extends StackProps {
    vpcId: string;
    env?: Environment;
}

export class VpcStack extends Stack {
    public readonly vpc: IVpc;

    constructor(scope: Construct, props?: VpcStackProps) {
        super(scope, props?.vpcId, props);

        this.vpc = Vpc.fromLookup(this, "VpcNetwork", {
            vpcId: props?.vpcId,
        });
    }
}

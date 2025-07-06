import {
    type IVpc,
    Instance,
    InstanceClass,
    InstanceSize,
    InstanceType,
    KeyPair,
    KeyPairFormat,
    type KeyPairProps,
    KeyPairType,
    Peer,
    Port,
    SecurityGroup,
    WindowsImage,
    WindowsVersion,
} from "aws-cdk-lib/aws-ec2";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../../config/shared/m47Stack";

/**
 * Properties for configuring the WindowsBastionStack.
 *
 * This interface extends the base M47StackProps and requires a VPC in which the bastion host will be deployed.
 */
export interface WindowsBastionStackProps extends M47StackProps {
    vpc: IVpc;
}

/**
 * AWS CDK stack for deploying a Windows Bastion host.
 *
 * This stack creates a Windows EC2 instance configured as a bastion host with RDP access, along with the necessary
 * security group, IAM role, and key pair. The bastion host uses a Windows Server 2022 AMI and is launched in the public
 * subnets of the provided VPC. The generated key pair is stored as a property for potential access after deployment.
 *
 * @remarks
 * Ensure that the VPC provided in the properties has public subnets to host the bastion instance.
 *
 * @example
 * const bastionStack = new WindowsBastionStack(app, {
 *   vpc: yourVpc,
 *   githubRepo: "your-repo",
 *   envName: "your-env",
 *   // other M47StackProps properties...
 * });
 */
export class WindowsBastionStack extends M47Stack {
    public bastionKeyPair: KeyPair;

    /**
     * Constructs a new instance of WindowsBastionStack.
     *
     * @param scope - The scope in which this stack is defined.
     * @param props - The stack properties including the VPC and additional configuration details.
     */
    constructor(scope: Construct, props: WindowsBastionStackProps) {
        super(scope, props);

        // Create an IAM role for the EC2 instance with EC2 service principal.
        const bastionRole = new Role(this, "ec2Role", {
            assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
        });

        // Create a security group allowing inbound RDP access.
        const bastionSecurityGroup = new SecurityGroup(
            this,
            "SecurityGroupEc2Bastion",
            {
                vpc: props.vpc,
                description: "Allow RDP",
                allowAllOutbound: true,
            },
        );

        bastionSecurityGroup.addIngressRule(
            Peer.anyIpv4(),
            Port.tcp(3389),
            "open RDP port",
        );

        // Define the Windows Server 2022 AMI.
        const windowsAmi = new WindowsImage(
            WindowsVersion.WINDOWS_SERVER_2022_ENGLISH_FULL_BASE,
        );

        // Define key pair properties for the bastion host.
        const bastionKeyPairProps: KeyPairProps = {
            keyPairName:
                `keyname-${props.githubRepo}-${props.envName}`.toLowerCase(),
            format: KeyPairFormat.PEM,
            type: KeyPairType.RSA,
        };

        // Create the key pair and store it as a property.
        this.bastionKeyPair = new KeyPair(this, "KeyPair", bastionKeyPairProps);

        // Create the bastion instance using the defined properties.
        const bastionInstance = new Instance(this, "Bastion", {
            vpc: props.vpc,
            instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
            machineImage: windowsAmi,
            securityGroup: bastionSecurityGroup,
            keyPair: this.bastionKeyPair,
            role: bastionRole,
            instanceName: `${props.githubRepo}-${props.envName}`,
            vpcSubnets: { subnets: props.vpc.publicSubnets },
            requireImdsv2: true,
        });

        // Apply project-specific tags to the bastion instance.
        this.addProjectTags(bastionInstance, props);
    }
}

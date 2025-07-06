import { type IVpc, Peer, Port, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { NetworkLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { LoadBalancerTarget } from "aws-cdk-lib/aws-route53-targets";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../config/shared/m47Stack";

/**
 * Properties for configuring the NetworkLoadBalancerStack.
 *
 * This interface extends M47StackProps and adds the following properties:
 * - vpc: The VPC in which the Network Load Balancer (NLB) will be deployed.
 * - certificateArn: The ARN of the ACM certificate (not used in this particular stack but might be required for related resources).
 * - domain: The root domain name to be used for DNS configuration.
 * - subdomain: The subdomain to assign to the NLB.
 *
 * @example
 * const props: NetworkLoadBalancerStackProps = {
 *   vpc: myVpc,
 *   certificateArn: "arn:aws:acm:region:account:certificate/abc123",
 *   domain: "example.com",
 *   subdomain: "api",
 *   // plus additional M47StackProps...
 * };
 */
export interface NetworkLoadBalancerStackProps extends M47StackProps {
    vpc: IVpc;
    certificateArn: string;
    domain: string;
    subdomain: string;
}

/**
 * NetworkLoadBalancerStack provisions a Network Load Balancer (NLB) in a specified VPC,
 * sets up a security group for it, and creates a corresponding Route 53 DNS A record.
 *
 * The NLB is configured to be internet-facing and uses the provided subdomain and domain for its DNS name.
 *
 * @example
 * new NetworkLoadBalancerStack(app, {
 *   vpc: myVpc,
 *   certificateArn: "arn:aws:acm:region:account:certificate/abc123",
 *   domain: "example.com",
 *   subdomain: "api",
 *   // plus additional M47StackProps...
 * });
 */
export class NetworkLoadBalancerStack extends M47Stack {
    public networkLoadBalancer: NetworkLoadBalancer;

    /**
     * Constructs a new instance of the NetworkLoadBalancerStack.
     *
     * The constructor creates a security group that allows all inbound traffic on port 80,
     * then creates an internet-facing Network Load Balancer in the provided VPC with that security group.
     * Finally, it sets up a Route 53 A record mapping the custom subdomain to the NLB.
     *
     * @param scope - The construct scope.
     * @param props - The stack properties including VPC, domain, and subdomain details.
     */
    constructor(scope: Construct, props: NetworkLoadBalancerStackProps) {
        super(scope, props);

        // Create a security group for the Network Load Balancer
        const nlbSecurityGroup = new SecurityGroup(
            this,
            `NLBSecurityGroup-${this.stackName}`,
            {
                vpc: props.vpc,
                securityGroupName: `nlb-sg-${this.stackName}`,
                description:
                    "Security group for NLB to allow traffic on port 80",
                allowAllOutbound: true,
            },
        );

        // Allow all inbound traffic from any IPv4 address on all ports
        nlbSecurityGroup.addIngressRule(
            Peer.anyIpv4(),
            Port.allTraffic(),
            "Allow all traffic from anywhere",
        );

        // Create an internet-facing Network Load Balancer using the defined security group
        this.networkLoadBalancer = new NetworkLoadBalancer(
            this,
            `NetworkLoadBalancer-${this.stackName}`,
            {
                vpc: props.vpc,
                internetFacing: true,
                loadBalancerName: `${props.subdomain}-nlb`,
                securityGroups: [nlbSecurityGroup],
            },
        );

        // Lookup the hosted zone for the provided domain
        const hostedZone = HostedZone.fromLookup(this, "baseZone", {
            domainName: props.domain,
        });

        // Create a DNS A record mapping the subdomain.domain to the NLB
        new ARecord(this, `ARecord-${this.stackName}`, {
            zone: hostedZone,
            recordName: `${props.subdomain}.${props.domain}`.toLowerCase(),
            target: RecordTarget.fromAlias(
                new LoadBalancerTarget(this.networkLoadBalancer),
            ),
        });
    }
}

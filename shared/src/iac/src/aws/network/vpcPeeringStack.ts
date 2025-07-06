import { Vpc, CfnVPCPeeringConnection, CfnRoute } from "aws-cdk-lib/aws-ec2";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../config/shared/m47Stack";

export interface VpcPeer {
    vpcId: string;
    destinationCidrBlock: string;
}
export interface VpcPeeringStackProps extends M47StackProps {
    source: VpcPeer;
    destination: VpcPeer;
}

// Exemple d'ús:
// const source: VpcPeer = { vpcId: 'vpc-0dddac3bbc04c06f9', destinationCidrBlock: '172.31.0.0/16' };
// const destination: VpcPeer = { vpcId: 'vpc-0993f29cd9a32fcbb', destinationCidrBlock: '10.0.0.0/16' };
// new VpcPeeringStack(app, 'VpcPeeringStack', source, destination);

export class VpcPeeringStack extends M47Stack {
    constructor(scope: Construct, props: VpcPeeringStackProps) {
        super(scope, props);

        const sourceVpc = Vpc.fromLookup(this, "SourceVPC", {
            vpcId: props.source.vpcId,
        });

        const destinationVpc = Vpc.fromLookup(this, "DestinationVPC", {
            vpcId: props.destination.vpcId,
        });

        const peering = new CfnVPCPeeringConnection(this, "VpcPeering", {
            vpcId: sourceVpc.vpcId,
            peerVpcId: destinationVpc.vpcId,
            peerRegion: this.region,
        });

        // Add routes from source to destination
        sourceVpc.publicSubnets.forEach((subnet, index) => {
            new CfnRoute(this, `SourceToDestinationRoutePublic${index}`, {
                routeTableId: subnet.routeTable.routeTableId,
                destinationCidrBlock: props.destination.destinationCidrBlock,
                vpcPeeringConnectionId: peering.ref,
            });
        });

        sourceVpc.privateSubnets.forEach((subnet, index) => {
            new CfnRoute(this, `SourceToDestinationRoutePrivate${index}`, {
                routeTableId: subnet.routeTable.routeTableId,
                destinationCidrBlock: props.destination.destinationCidrBlock,
                vpcPeeringConnectionId: peering.ref,
            });
        });

        // Add routes from destination to source
        destinationVpc.publicSubnets.forEach((subnet, index) => {
            new CfnRoute(this, `DestinationToSourceRoutePublic${index}`, {
                routeTableId: subnet.routeTable.routeTableId,
                destinationCidrBlock: props.source.destinationCidrBlock,
                vpcPeeringConnectionId: peering.ref,
            });
        });

        destinationVpc.privateSubnets.forEach((subnet, index) => {
            new CfnRoute(this, `DestinationToSourceRoutePrivate${index}`, {
                routeTableId: subnet.routeTable.routeTableId,
                destinationCidrBlock: props.source.destinationCidrBlock,
                vpcPeeringConnectionId: peering.ref,
            });
        });
    }
}

import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import {
    VpcPeeringStack,
    type VpcPeeringStackProps,
    type VpcPeer,
} from "../../../src/aws/network/vpcPeeringStack";
import { AppEnvironment } from "../../../src/config/env/appEnvironment";
import { Vpc } from "aws-cdk-lib/aws-ec2";

describe("VpcPeeringStack", () => {
    const env = {
        account: "account",
        region: "eu-west-1",
    };

    beforeAll(() => {
        jest.spyOn(Vpc, "fromLookup").mockImplementation(
            (scope, id, options) => {
                return {
                    vpcId: options.vpcId,
                    publicSubnets: [
                        { routeTable: { routeTableId: "rtb-public-1" } },
                        { routeTable: { routeTableId: "rtb-public-2" } },
                    ],
                    privateSubnets: [
                        { routeTable: { routeTableId: "rtb-private-1" } },
                        { routeTable: { routeTableId: "rtb-private-2" } },
                    ],
                } as Vpc;
            },
        );
    });
    afterAll(() => {
        jest.restoreAllMocks();
    });

    test("Should_CreateVpcPeeringConnection_When_StackIsCalled", () => {
        // Arrange
        const stack = new Stack(new App(), "VpcPeeringStackTest", { env });

        const props: VpcPeeringStackProps = {
            name: "VpcPeeringStack",
            stackName: "shared",
            envName: AppEnvironment.Test,
            githubRepo: "shared-test",
            source: {
                vpcId: "vpc-0dddac3bbc04c06f9",
                destinationCidrBlock: "172.31.0.0/16",
            } as VpcPeer,
            destination: {
                vpcId: "vpc-0993f29cd9a32fcbb",
                destinationCidrBlock: "10.0.0.0/16",
            } as VpcPeer,
        };

        // Act
        const actual = new VpcPeeringStack(stack, props);

        // Assert
        const template = Template.fromStack(actual).toJSON();
        expect(template).toMatchSnapshot("VpcPeeringStackTest");
    });
});

import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import {
    InstanceClass,
    InstanceSize,
    InstanceType,
    SubnetType,
    Vpc,
} from "aws-cdk-lib/aws-ec2";
import { PostgresEngineVersion } from "aws-cdk-lib/aws-rds";
import {
    RdsStack,
    type RdsStackProps,
} from "../../../src/aws/database/rdsStack";
import { AppEnvironment } from "../../../src/config/env/appEnvironment";

describe("RdsStackTest", () => {
    const LEGACY_VPC_CIDR = "10.0.0.0/16";
    test("Should_createRdsStack_When_ParamsAreValids", () => {
        // Arrange
        const app = new App();
        const stack = new Stack(app, "TestStack");

        const mockProps: RdsStackProps = {
            vpc: createVpc(stack),
            databaseName: "testdb",
            databaseUserName: "testuser",
            backupRetentionDays: 7,
            storageSizeGb: 20,
            monitoringIntervalSeconds: 60,
            engineVersion: PostgresEngineVersion.VER_15,
            instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
            githubRepo: "test-repo",
            envName: AppEnvironment.Production,
            stackName: "test-rds-stack",
            name: "TestRDS",
        };

        // Act
        const rdsStack = new RdsStack(stack, mockProps);

        // Assert
        const template = Template.fromStack(rdsStack);
        expect(template.toJSON()).toMatchSnapshot("RdsStackTest");

        template.hasResourceProperties("AWS::RDS::DBInstance", {
            DBInstanceIdentifier: mockProps.databaseName,
            DBName: mockProps.databaseName,
            Engine: "postgres",
            MasterUsername: mockProps.databaseUserName,
            DBInstanceClass: `db.${mockProps.instanceType.toString()}`,
            PreferredMaintenanceWindow: "Sun:03:00-Sun:04:00",
            EngineVersion:
                mockProps.engineVersion.postgresFullVersion.toString(),
        });

        template.hasResourceProperties("AWS::EC2::SecurityGroup", {
            GroupName: `${mockProps.githubRepo}Database`,
            SecurityGroupIngress: [
                {
                    FromPort: 5432,
                    ToPort: 5432,
                    IpProtocol: "tcp",
                    Description: "Allow PostgreSQL inbound from VPC",
                },
                {
                    FromPort: 5432,
                    ToPort: 5432,
                    IpProtocol: "tcp",
                    CidrIp: LEGACY_VPC_CIDR,
                    Description: "Allow PostgreSQL inbound from legacy VPC",
                },
            ],
        });

        template.resourceCountIs("AWS::SecretsManager::Secret", 1);

        template.hasResourceProperties("AWS::SecretsManager::Secret", {
            Name: "testdbPostgresqlCredentialsProduction",
        });

        const secretResources = template.findResources(
            "AWS::SecretsManager::Secret",
        );
        const secretResource = Object.values(secretResources)[0];
        expect(secretResource.Properties.Description).toContain("testdb");
        expect(secretResource.Properties.Description).toContain(
            "Database Credentials",
        );

        template.hasResourceProperties("AWS::SSM::Parameter", {
            Description: "PostgreSQL string connection TestRepo DB Production",
            Name: "/M47.TestRepo.Apps.Minimal.Api/Production/Database/ConnectionStrings/TestdbPostgres",
            Type: "String",
        });

        template.hasResourceProperties("AWS::SSM::Parameter", {
            Description: "PostgreSQL string connection TestRepo DB Production",
            Name: "/M47.TestRepo.Apps.WorkerService/Production/Database/ConnectionStrings/TestdbPostgres",
            Type: "String",
        });
    });

    function createVpc(scope: Stack) {
        return new Vpc(scope, "MockVpc", {
            maxAzs: 2,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: "Public",
                    subnetType: SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: "Private",
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
            ],
        });
    }
});

import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import {
    type IVpc,
    type InstanceType,
    Peer,
    Port,
    SecurityGroup,
    type SubnetSelection,
} from "aws-cdk-lib/aws-ec2";
import {
    Credentials,
    DatabaseInstance,
    DatabaseInstanceEngine,
    type DatabaseInstanceProps,
    ParameterGroup,
    type PostgresEngineVersion,
    SubnetGroup,
} from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { ParameterTier, StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../config/shared/m47Stack";
import { LEGACY_VPC_CIDR } from "../network/vpcConstants";

export interface RdsStackProps extends M47StackProps {
    vpc: IVpc;
    databaseName: string;
    databaseUserName: string;
    backupRetentionDays: number;
    storageSizeGb: number;
    monitoringIntervalSeconds: number;
    engineVersion: PostgresEngineVersion;
    instanceType: InstanceType;
    deletionProtection?: boolean;
}

/**
 * RdsStack sets up an Amazon RDS PostgreSQL database instance with the provided configuration.
 *
 * This stack creates a security group, subnet group, and parameter group for the database instance.
 * It manages database credentials using AWS Secrets Manager and stores connection strings in AWS
 * Systems Manager Parameter Store. The database instance is configured with specified backup retention,
 * storage size, and monitoring interval, and is deployed in the provided VPC using private subnets.
 *
 * @example
 * const rdsStack = new RdsStack(app, {
 *   vpc: myVpc,
 *   databaseName: "myDatabase",
 *   databaseUserName: "admin",
 *   backupRetentionDays: 7,
 *   storageSizeGb: 20,
 *   monitoringIntervalSeconds: 60,
 *   engineVersion: PostgresEngineVersion.VER_13,
 *   instanceType: InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO),
 *   deletionProtection: false,
 *   // other M47StackProps properties...
 * });
 */
export class RdsStack extends M47Stack {
    public databaseSecurityGroup: SecurityGroup;

    /**
     * Constructs a new instance of the RdsStack.
     *
     * This constructor creates the necessary security group, subnet group, and parameter group for the database.
     * It generates database credentials using AWS Secrets Manager, deploys the RDS PostgreSQL instance, and outputs
     * relevant information such as the secret ARN and database endpoint.
     *
     * @param scope - The scope in which this stack is defined.
     * @param props - The properties for configuring the RDS stack.
     */
    constructor(scope: Construct, props: RdsStackProps) {
        super(scope, props);

        const privateSubnets: SubnetSelection = {
            subnets: props.vpc.privateSubnets,
        };

        const allTrafficPort = Port.allTraffic();
        const tcp5432 = Port.tcpRange(5432, 5432);

        this.databaseSecurityGroup = new SecurityGroup(
            this,
            "databaseSecurityGroup",
            {
                vpc: props.vpc,
                allowAllOutbound: true,
                description: `${props.githubRepo}Database`,
                securityGroupName: `${props.githubRepo}Database`,
            },
        );

        this.databaseSecurityGroup.addIngressRule(
            this.databaseSecurityGroup,
            tcp5432,
            "tcp5432 PostgreSQL",
        );
        this.databaseSecurityGroup.addIngressRule(
            Peer.ipv4(props.vpc.vpcCidrBlock),
            tcp5432,
            "Allow PostgreSQL inbound from VPC",
        );

        this.databaseSecurityGroup.addIngressRule(
            Peer.ipv4(LEGACY_VPC_CIDR),
            tcp5432,
            "Allow PostgreSQL inbound from legacy VPC",
        );

        this.databaseSecurityGroup.addEgressRule(
            Peer.anyIpv4(),
            allTrafficPort,
            "all out",
        );

        const dbSubnetGroup = new SubnetGroup(this, "DatabaseSubnetGroup", {
            vpc: props.vpc,
            description: `${props.stackName}subnet group`,
            vpcSubnets: privateSubnets,
            subnetGroupName: `${props.stackName}subnet group`,
        });

        const dbSecret = new Secret(this, "postgresqlCredentials", {
            secretName: `${props.databaseName}PostgresqlCredentials${props.envName}`,
            description: `${props.databaseName}PostgreSQL Database Credentials`,
            generateSecretString: {
                excludeCharacters: "\"@/\\ ';:,=*!()$",
                generateStringKey: "password",
                passwordLength: 30,
                secretStringTemplate: JSON.stringify({
                    username: props.databaseUserName,
                }),
            },
        });

        const dbCredentials = Credentials.fromSecret(
            dbSecret,
            props.databaseUserName,
        );

        const dbParameterGroup = new ParameterGroup(this, "ParameterGroup", {
            engine: DatabaseInstanceEngine.postgres({
                version: props.engineVersion,
            }),
        });

        const databaseProps: DatabaseInstanceProps = {
            databaseName: props.databaseName,
            instanceIdentifier: props.databaseName,
            credentials: dbCredentials,
            engine: DatabaseInstanceEngine.postgres({
                version: props.engineVersion,
            }),
            backupRetention: Duration.days(props.backupRetentionDays),
            allocatedStorage: Number(props.storageSizeGb),
            maxAllocatedStorage: Math.ceil(props.storageSizeGb * 1.1),
            securityGroups: [this.databaseSecurityGroup],
            allowMajorVersionUpgrade: false,
            autoMinorVersionUpgrade: true,
            instanceType: props.instanceType,
            vpcSubnets: privateSubnets,
            vpc: props.vpc,
            removalPolicy: RemovalPolicy.DESTROY,
            storageEncrypted: true,
            monitoringInterval: Duration.seconds(
                Number(props.monitoringIntervalSeconds),
            ),
            parameterGroup: dbParameterGroup,
            subnetGroup: dbSubnetGroup,
            publiclyAccessible: false,
            deletionProtection: props.deletionProtection ?? true,
            preferredMaintenanceWindow: "Sun:03:00-Sun:04:00",
        };

        const postgresInstance = new DatabaseInstance(
            this,
            "PostgresDatabase",
            databaseProps as DatabaseInstanceProps,
        );

        this.addProjectTags(postgresInstance, props);

        // Output properties to help locate the credentials
        new CfnOutput(this, "Secret Name", { value: dbSecret.secretName });
        new CfnOutput(this, "Secret ARN", { value: dbSecret.secretArn });
        new CfnOutput(this, "Secret Full ARN", {
            value: dbSecret.secretFullArn || "",
        });

        new CfnOutput(this, `${props.name}-${props.envName}-PostgresEndpoint`, {
            exportName: `${this.toCloudFormation()}-${props.envName}-PostgresEndPoint`,
            value: postgresInstance.dbInstanceEndpointAddress,
        });

        new CfnOutput(this, `${props.name}-${props.envName}-PostgresUserName`, {
            exportName: `${this.toCloudFormation()}-${props.envName}-PostgresUserName`,
            value: props.databaseUserName,
        });

        new CfnOutput(this, `${props.name}-${props.envName}-PostgresDbName`, {
            exportName: `${this.toCloudFormation()}-${props.envName}-PostgresDbName`,
            value: props.databaseName,
        });

        this.setDbCredentialIntoSSM(postgresInstance, dbCredentials, props);
    }

    /**
     * Stores the database connection string in AWS Systems Manager Parameter Store.
     *
     * This method creates SSM string parameters for different applications by generating the connection
     * string from the database instance and credentials.
     *
     * @param databaseInstance - The RDS database instance.
     * @param credentials - The database credentials.
     * @param props - The RDS stack properties.
     */
    private setDbCredentialIntoSSM(
        databaseInstance: DatabaseInstance,
        credentials: Credentials,
        props: RdsStackProps,
    ) {
        const secretValue = this.createSecretValue(
            databaseInstance,
            credentials,
            props,
        );
        this.createStringParameter(
            "apiParameterPostgresConnection",
            secretValue,
            props,
            "Minimal.Api",
        );
        this.createStringParameter(
            "workerParameterPostgresConnection",
            secretValue,
            props,
            "WorkerService",
        );
    }

    /**
     * Creates a PostgreSQL connection string based on the database instance and credentials.
     *
     * @param databaseInstance - The RDS database instance.
     * @param credentials - The database credentials.
     * @param props - The RDS stack properties.
     * @returns The PostgreSQL connection string.
     */
    private createSecretValue(
        databaseInstance: DatabaseInstance,
        credentials: Credentials,
        props: RdsStackProps,
    ): string {
        const host = databaseInstance.dbInstanceEndpointAddress;
        const userName = props.databaseUserName;
        const dbname = props.databaseName;
        const port = databaseInstance.dbInstanceEndpointPort;
        const password = credentials.password?.unsafeUnwrap();

        return `host=${host};user=${userName};dbname=${dbname};port=${port};password=${password};sslmode=require;`;
    }

    /**
     * Creates an AWS Systems Manager string parameter to store the database connection string.
     *
     * This method creates a string parameter with a generated name based on the project, environment, and database name.
     * The parameter is then output for reference.
     *
     * @param id - A unique identifier for the parameter.
     * @param secretValue - The database connection string.
     * @param props - The RDS stack properties.
     * @param appType - The application type for which the connection string is used.
     * @returns The name of the created string parameter.
     */
    private createStringParameter(
        id: string,
        secretValue: string,
        props: RdsStackProps,
        appType: string,
    ) {
        const parameterName = `/M47.${this.toPascalCase(props.githubRepo)}.Apps.${appType}/${this.toPascalCase(props.envName)}/Database/ConnectionStrings/${this.toPascalCase(props.databaseName)}Postgres`;

        const stringParameter = new StringParameter(this, id, {
            allowedPattern: ".*",
            description: `PostgreSQL string connection ${this.toPascalCase(props.githubRepo)} DB ${this.toPascalCase(props.envName)}`,
            parameterName: parameterName,
            stringValue: secretValue,
            tier: ParameterTier.STANDARD,
        });

        new CfnOutput(this, `${id}ParameterNameOutput`, {
            value: stringParameter.parameterName,
            description: "The name of the SSM parameter",
            exportName: `${id}ParameterName`,
        });

        return parameterName;
    }

    /**
     * Converts a string to PascalCase.
     *
     * This method transforms a given string by converting it to lowercase and then capitalizing the first letter
     * of each word that is separated by spaces, underscores, or hyphens.
     *
     * @param str - The input string.
     * @returns The string converted to PascalCase.
     */
    private toPascalCase(str: string): string {
        return str
            .toLowerCase()
            .replace(/(?:^|[\s_-])(\w)/g, (_, c) => c.toUpperCase());
    }
}

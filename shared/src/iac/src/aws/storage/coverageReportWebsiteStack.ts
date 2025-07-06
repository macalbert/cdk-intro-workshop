import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import {
    Distribution,
    type ErrorResponse,
    OriginAccessIdentity,
    ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import {
    ARecord,
    PublicHostedZone,
    RecordTarget,
} from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import {
    BlockPublicAccess,
    Bucket,
    BucketAccessControl,
    BucketEncryption,
    HttpMethods,
} from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../config/shared/m47Stack";

/**
 * Properties for configuring the CoverageReportWebsiteStack.
 *
 * This interface extends M47StackProps and includes properties required to deploy a static website
 * for code coverage reports. The properties include:
 * - bucketName: The name of the S3 bucket to host the website.
 * - subdomainName: The subdomain for the website.
 * - certificateArn: The ARN of the ACM certificate used for the CloudFront distribution.
 * - hostedZoneId: The ID of the Route 53 hosted zone.
 * - domain: The domain name for the website.
 *
 * @example
 * const props: CoverageReportWebsiteStackProps = {
 *   bucketName: "coverage-report-bucket",
 *   subdomainName: "coverage",
 *   certificateArn: "arn:aws:acm:region:account:certificate/abc123",
 *   hostedZoneId: "Z1234567890",
 *   domain: "example.com",
 *   // plus additional M47StackProps properties...
 * };
 */
export interface CoverageReportWebsiteStackProps extends M47StackProps {
    bucketName: string;
    subdomainName: string;
    certificateArn: string;
    hostedZoneId: string;
    domain: string;
}

/**
 * CoverageReportWebsiteStack provisions a static website for code coverage reports using S3 and CloudFront.
 *
 * The stack creates an S3 bucket to securely host the static website and configures a CloudFront distribution
 * with custom error responses. It also sets up a Route 53 A record for the custom domain, allowing the website
 * to be accessed via a friendly URL.
 *
 * The CloudFront distribution is configured with error responses for HTTP 403 and 404 that both redirect to
 * index.html. Project-specific tags are applied to resources, and CloudFormation outputs provide the CloudFront
 * distribution domain name and the DNS record.
 *
 * @example
 * new CoverageReportWebsiteStack(app, {
 *   bucketName: "coverage-report-bucket",
 *   subdomainName: "coverage",
 *   certificateArn: "arn:aws:acm:region:account:certificate/abc123",
 *   hostedZoneId: "Z1234567890",
 *   domain: "example.com",
 *   // plus additional M47StackProps properties...
 * });
 */
export class CoverageReportWebsiteStack extends M47Stack {
    constructor(scope: Construct, props: CoverageReportWebsiteStackProps) {
        super(scope, props);

        // Construct the full domain name (e.g., coverage.example.com)
        const fullDomainName = [props.subdomainName, props.domain]
            .join(".")
            .toLowerCase();

        // Create a private S3 bucket for hosting the static website
        const bucketWebsite = new Bucket(this, "WebsiteBucket", {
            accessControl: BucketAccessControl.PRIVATE,
            publicReadAccess: false,
            versioned: false,
            removalPolicy: RemovalPolicy.DESTROY,
            bucketName: props.bucketName,
            autoDeleteObjects: true,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            encryption: BucketEncryption.S3_MANAGED,
            cors: [
                {
                    allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
                    allowedOrigins: ["*"],
                    allowedHeaders: ["*"],
                },
            ],
            enforceSSL: true,
        });

        // Apply project-specific tags to the bucket
        this.addProjectTags(bucketWebsite, props);

        // Create an Origin Access Identity for CloudFront to securely access the S3 bucket
        const originAccessIdentity = new OriginAccessIdentity(
            this,
            "originAccessIdentity",
            {
                comment: `Setup access from CloudFront to the bucket ${fullDomainName} (read)`,
            },
        );

        // Grant read access to the Origin Access Identity
        bucketWebsite.grantRead(originAccessIdentity);

        // Import the ACM certificate for the custom domain
        const certificate = Certificate.fromCertificateArn(
            this,
            "Certificate",
            props.certificateArn,
        );

        // Define custom error responses for the CloudFront distribution
        const errorResponses: ErrorResponse[] = [
            {
                httpStatus: 403,
                responseHttpStatus: 200,
                responsePagePath: "/index.html",
                ttl: Duration.seconds(10),
            },
            {
                httpStatus: 404,
                responseHttpStatus: 200,
                responsePagePath: "/index.html",
                ttl: Duration.seconds(10),
            },
        ];

        // Create the CloudFront distribution for the website
        const distribution = new Distribution(this, "distribution", {
            domainNames: [fullDomainName],
            defaultBehavior: {
                origin: S3BucketOrigin.withOriginAccessIdentity(bucketWebsite, {
                    originAccessIdentity: originAccessIdentity,
                }),
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            defaultRootObject: "index.html",
            certificate: certificate,
            errorResponses: errorResponses,
        });

        // Apply project-specific tags to the CloudFront distribution
        this.addProjectTags(bucketWebsite, props);

        // Import the Route 53 hosted zone using provided attributes
        const zoneFromAttributes =
            PublicHostedZone.fromPublicHostedZoneAttributes(
                this,
                "publicHostedZone",
                {
                    zoneName: props.domain,
                    hostedZoneId: props.hostedZoneId,
                },
            );

        // Create a Route 53 A record mapping the full domain name to the CloudFront distribution
        const aliasRecord = new ARecord(this, "AliasRecord", {
            recordName: fullDomainName,
            target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
            zone: zoneFromAttributes,
        });

        // Apply project-specific tags to the alias record
        this.addProjectTags(aliasRecord, props);

        // Output the CloudFront distribution domain name for external reference
        new CfnOutput(this, "CoverageReportCdn", {
            value: distribution.distributionDomainName,
            description:
                "The domain name of the CloudFront distribution for Coverage Report",
            exportName: `${this.toCloudFormation()}CoverageReportCdn`.replace(
                /-/g,
                "",
            ),
        });

        // Output the DNS record name for external reference
        new CfnOutput(this, "CoverageReportDns", {
            value:
                aliasRecord.domainName ||
                `${fullDomainName}.${zoneFromAttributes.zoneName}`,
            description: "The domain name for the alias record",
            exportName: `${this.toCloudFormation()}CoverageReportDns`.replace(
                /-/g,
                "",
            ),
        });
    }
}

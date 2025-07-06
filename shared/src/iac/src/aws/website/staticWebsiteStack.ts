import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import {
    Distribution,
    type ErrorResponse,
    OriginAccessIdentity,
    ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import {
    Function as LambdaFunction,
    FunctionCode,
    FunctionEventType,
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
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../config/shared/m47Stack";

/**
 * Properties for configuring the StaticWebsiteStack.
 *
 * This interface extends the base M47StackProps and adds properties required for deploying a static website.
 *
 * Properties:
 * - recordName: The subdomain or record prefix for the website.
 * - domainName: The root domain name.
 * - distFolderPath: The local path to the website distribution folder.
 * - certificateArn: The ARN of the ACM certificate for the custom domain.
 * - hostedZoneId: The ID of the Route 53 hosted zone.
 *
 * @example
 * const props: StaticWebsiteStackProps = {
 *   recordName: "www",
 *   domainName: "example.com",
 *   distFolderPath: "./dist",
 *   certificateArn: "arn:aws:acm:region:account:certificate/abc123",
 *   hostedZoneId: "Z123456ABCDEFG",
 *   // plus additional M47StackProps properties...
 * };
 */
export interface StaticWebsiteStackProps extends M47StackProps {
    recordName: string;
    domainName: string;
    distFolderPath: string;
    certificateArn: string;
    hostedZoneId: string;
}

/**
 * StaticWebsiteStack provisions a static website using an S3 bucket and CloudFront distribution.
 *
 * This stack creates an S3 bucket configured for hosting a static website with strict security settings.
 * It then creates an Origin Access Identity (OAI) to allow CloudFront to securely access the bucket.
 * A CloudFront distribution is configured with custom error responses and a URL rewrite function to handle
 * pretty URLs. Finally, a Route 53 A record is created to map a custom domain name to the distribution.
 *
 * CloudFormation outputs provide the CloudFront distribution domain name and the DNS record name.
 *
 * @example
 * new StaticWebsiteStack(app, {
 *   recordName: "www",
 *   domainName: "example.com",
 *   distFolderPath: "./dist",
 *   certificateArn: "arn:aws:acm:region:account:certificate/abc123",
 *   hostedZoneId: "Z123456ABCDEFG",
 *   // plus additional M47StackProps properties...
 * });
 */
export class StaticWebsiteStack extends M47Stack {
    constructor(scope: Construct, props: StaticWebsiteStackProps) {
        super(scope, props);

        // Construct the full domain name (e.g., www.example.com)
        const fullDomainName = [props.recordName, props.domainName]
            .join(".")
            .toLowerCase();

        // Create a private S3 bucket for the static website
        const bucketWebsite = new Bucket(this, "static-website-bucket", {
            accessControl: BucketAccessControl.PRIVATE,
            publicReadAccess: false,
            versioned: false,
            removalPolicy: RemovalPolicy.DESTROY,
            bucketName: fullDomainName,
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

        // Tag the bucket with project-specific metadata
        this.addProjectTags(bucketWebsite, props);

        // Create an Origin Access Identity to restrict bucket access to CloudFront
        const originAccessIdentity = new OriginAccessIdentity(
            this,
            "originAccessIdentity",
            {
                comment: `Setup access from CloudFront to the bucket ${fullDomainName} (read)`,
            },
        );

        // Grant CloudFront OAI read access to the bucket
        bucketWebsite.grantRead(originAccessIdentity);

        // Import the ACM certificate for the custom domain
        const certificate = Certificate.fromCertificateArn(
            this,
            "certificate",
            props.certificateArn,
        );

        // Define custom error responses for the distribution
        const errorResponses: ErrorResponse[] = [];

        const errorResponse403: ErrorResponse = {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/403.html",
            ttl: Duration.seconds(10),
        };

        const errorResponse404: ErrorResponse = {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/404.html",
            ttl: Duration.seconds(10),
        };

        errorResponses.push(errorResponse403, errorResponse404);

        // Create the CloudFront distribution for the static website
        const distribution = new Distribution(this, "distribution", {
            domainNames: [fullDomainName],
            defaultBehavior: {
                origin: S3BucketOrigin.withOriginAccessIdentity(bucketWebsite, {
                    originAccessIdentity: originAccessIdentity,
                }),
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                functionAssociations: [
                    {
                        eventType: FunctionEventType.VIEWER_REQUEST,
                        function: new LambdaFunction(
                            this,
                            `${fullDomainName}-url-rewrite`.toLowerCase(),
                            {
                                // Inline function code to rewrite URLs for pretty paths
                                code: FunctionCode.fromInline(`
                  function handler(event) {
                    var request = event.request;
                    var uri = request.uri;
                    var staticFileExtensions = ['.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.json', '.xml'];
                    function hasKnownExtension(uri) {
                      return staticFileExtensions.some(extension => uri.endsWith(extension));
                    }
                    // Remove trailing slash if it's not the homepage
                    if (uri.endsWith('/') && uri !== '/') {
                      uri = uri.slice(0, -1);
                    }
                    // Append .html if the URI does not represent the homepage or a static file
                    if (uri !== '/' && !hasKnownExtension(uri)) {
                      uri += '.html';
                    }
                    request.uri = uri;
                    return request;
                  }
                `),
                            },
                        ),
                    },
                ],
            },
            defaultRootObject: "index.html",
            certificate: certificate,
            errorResponses: errorResponses,
        });

        // Tag the distribution with project-specific metadata
        this.addProjectTags(distribution, props);

        // Deploy static website files from the local distribution folder to the S3 bucket,
        // and invalidate CloudFront cache for all paths.
        new BucketDeployment(this, "deploy-static-website", {
            sources: [Source.asset(props.distFolderPath)],
            destinationBucket: bucketWebsite,
            distribution,
            distributionPaths: ["/*"],
        });

        // Import the Route 53 hosted zone by its attributes
        const zoneFromAttributes =
            PublicHostedZone.fromPublicHostedZoneAttributes(
                this,
                "publicHostedZone",
                {
                    zoneName: props.domainName,
                    hostedZoneId: props.hostedZoneId,
                },
            );

        // Create a Route 53 A record that aliases the custom domain to the CloudFront distribution
        const aliasRecord = new ARecord(this, "webDomainRecord", {
            zone: zoneFromAttributes,
            recordName: `${props.recordName}.${props.domainName}`.toLowerCase(),
            target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
        });

        // Tag the alias record with project-specific metadata
        this.addProjectTags(aliasRecord, props);

        // Output the CloudFront distribution domain name and the DNS record name for external reference
        new CfnOutput(this, "CloudFrontDistributionDomainName", {
            value: distribution.distributionDomainName,
            description: "CloudFront distribution domain",
            exportName: `${this.toCloudFormation()}-CloudFrontDistributionDomainName`,
        });

        new CfnOutput(this, "DnsRecordName", {
            value:
                aliasRecord.domainName ||
                `${props.recordName}.${zoneFromAttributes.zoneName}`,
            description: "The DNS record name",
            exportName: `${this.toCloudFormation()}-AliasRecord`,
        });
    }
}

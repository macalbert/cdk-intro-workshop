import { RemovalPolicy } from "aws-cdk-lib";
import { Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../config/shared/m47Stack";

/**
 * Properties for configuring the S3Stack.
 *
 * This interface extends M47StackProps and includes a bucketName property which defines the name of the S3 bucket.
 *
 * @example
 * const props: S3StackProps = {
 *   bucketName: "my-bucket",
 *   // plus additional M47StackProps properties...
 * };
 */
export interface S3StackProps extends M47StackProps {
    bucketName: string;
}

/**
 * S3Stack provisions an S3 bucket with specific configuration.
 *
 * The bucket is created using the provided bucketName with a RETAIN removal policy and SSL enforcement enabled.
 * Additionally, a CORS rule is added to allow GET, PUT, and HEAD requests from any origin.
 *
 * @example
 * new S3Stack(app, {
 *   bucketName: "my-bucket",
 *   // plus additional M47StackProps properties...
 * });
 */
export class S3Stack extends M47Stack {
    public readonly bucket: Bucket;

    /**
     * Constructs a new instance of the S3Stack.
     *
     * This constructor creates an S3 bucket using the specified bucketName and configuration.
     * It sets a RETAIN removal policy, enforces SSL, and adds a CORS rule to allow specific HTTP methods.
     *
     * @param scope - The scope in which this stack is defined.
     * @param props - The properties for configuring the S3 bucket.
     */
    constructor(scope: Construct, props: S3StackProps) {
        super(scope, props);

        this.bucket = new Bucket(this, "S3Bucket", {
            bucketName: props.bucketName,
            removalPolicy: RemovalPolicy.RETAIN,
            enforceSSL: true,
        });

        this.bucket.addCorsRule({
            allowedOrigins: ["*"],
            allowedMethods: [
                HttpMethods.GET,
                HttpMethods.PUT,
                HttpMethods.HEAD,
            ],
            allowedHeaders: ["*"],
        });
    }
}

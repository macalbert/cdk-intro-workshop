import { RemovalPolicy } from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";
import type { Construct } from "constructs";
import { M47Stack, type M47StackProps } from "../../../config/shared/m47Stack";

/**
 * Properties for configuring the ECR Stack.
 *
 * This interface extends the base M47StackProps and adds properties specific to the ECR repository,
 * including the repository URI and repository name.
 */
export interface EcrStackProps extends M47StackProps {
    ecrRepositoryUri: string;
    ecrRepositoryName: string;
}

/**
 * AWS CDK stack for managing an ECR repository.
 *
 * This stack provides methods to retrieve an existing ECR repository or create a new one.
 * The repository created using this stack is configured with a removal policy of DESTROY.
 *
 * @example
 * const ecrStack = new EcrStack(app, {
 *   ecrRepositoryUri: "your-repo-uri",
 *   ecrRepositoryName: "your-repo-name",
 *   // other M47StackProps properties
 * });
 * const repository = ecrStack.createRepository();
 */
export class EcrStack extends M47Stack {
    props: EcrStackProps;
    scope: Construct;

    /**
     * Constructs a new instance of the EcrStack.
     *
     * @param scope - The scope in which this stack is defined.
     * @param props - The stack properties including the ECR repository configuration.
     */
    constructor(scope: Construct, props: EcrStackProps) {
        super(scope, props);

        this.scope = scope;
        this.props = props;
    }

    /**
     * Retrieves an existing ECR repository by its name.
     *
     * @returns The Repository instance corresponding to the repository name provided in the properties.
     */
    getRepository() {
        return Repository.fromRepositoryName(
            this.scope,
            this.props.ecrRepositoryName,
            this.props.ecrRepositoryName,
        );
    }

    /**
     * Creates a new ECR repository.
     *
     * @returns The newly created Repository instance with a removal policy set to DESTROY.
     */
    createRepository() {
        return new Repository(this.scope, this.props.ecrRepositoryName, {
            repositoryName: this.props.ecrRepositoryName,
            removalPolicy: RemovalPolicy.DESTROY,
        });
    }
}

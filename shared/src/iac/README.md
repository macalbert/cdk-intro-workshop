# Welcome to Shared IaC CDK TypeScript project

This Intrastucture as Code project group all the shared resources between all microservices. Like VPC, bastions to access through the resources there, security groups, and etc.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npm run lint`    run ESLint to verify defined rules
* `npm run format`  run Prettier to format de code
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## Useful documents

* CDK Setup [here](../../../docs/iac/CdkSetup.md)
* How to setup new CDK Project [here](../../../docs/iac/CreateCdkProject.md)

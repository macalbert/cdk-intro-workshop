# Session 4: Mastering CDK Commands 🛠️

## 🚀 Key Commands

### 1. **Bootstrap**

- Initializes the environment for CDK.
- Sets up resources like an S3 bucket for deployment artifacts.

**Command:**

```bash
cdk bootstrap
```

### 2. **Install Dependencies**

- Ensures all required libraries and modules are installed.

**Command:**

```bash
npm install
```

### 3. **Deploy**

- Provisions resources to AWS based on your CDK stack.

**Command:**

```bash
cdk deploy
```

### 4. **Diff**

- Compares local changes with deployed resources.
- Helps you understand what changes will be made before deploying.

**Command:**

```bash
cdk diff
```

### 5. **Synth**

- Generates the CloudFormation template for your stack.
- Lets you validate changes without deploying.

**Command:**

```bash
cdk synth
```

## 💡 Tips for Using CDK Commands

- Use `cdk diff` before deploying to avoid unexpected changes.
- Run `cdk synth` to debug and validate your stack.
- Always bootstrap your environment before deploying for the first time.

## 📚 References

- [AWS CDK CLI Documentation](https://docs.aws.amazon.com/cdk/latest/guide/cli.html)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/home.html)

### Additional Arguments

#### `--require-approval never`

- **Purpose**: Skips the approval prompt for deploying resources that require manual confirmation.
- **Use Case**: Ideal for CI/CD pipelines where human intervention is not feasible.
- **Effect**: Ensures the deployment proceeds without waiting for approval, even for sensitive changes like IAM roles or security groups.

#### `--no-execute`

- **Purpose**: Prepares the deployment but does not actually provision resources.
- **Use Case**: Useful for validating the deployment plan without making changes to the AWS environment.
- **Effect**: Generates and displays the CloudFormation changeset without executing it, allowing you to review the changes before applying them.

---

[🔙 CDK Constructs 🏗️](./03-cdk-constructs.md) | [🏠 Index](../README.md) | [🔜 Lambda Runtime Support 🧩](./05-lambda-runtime-support.md)

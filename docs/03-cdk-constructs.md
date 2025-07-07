# Session 3: CDK Constructs 🏗️

## 🏗️ CDK Constructs Levels — Explained with Metaphors & Examples

| Level  | Who's in control?         | What do you get?                                      | Typical examples                                 |
| ------ | ------------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| **L1** | You control everything    | 💡 *Raw CloudFormation resource*                      | `CfnBucket`, `CfnFunction`, `CfnTable`           |
| **L2** | AWS gives you tools       | 🧰 *Reusable modules with sensible defaults*          | `s3.Bucket`, `lambda.Function`, `dynamodb.Table` |
| **L3** | AWS does most of the work | 🚀 *High-level abstractions for real-world use cases* | `aws-s3-deployment`, `aws-apigateway-lambda`     |

---

## 🧱 L1 – "Raw Bricks"

* ✍️ You write the CloudFormation equivalent directly.
* 📋 Requires deep understanding of the AWS resource specification.
* 🎯 Best when you need **full control** or are working with newly released features.

```ts
// Raw CloudFormation
new s3.CfnBucket(this, 'MyRawBucket', {
  bucketName: 'raw-bucket',
  versioningConfiguration: { status: 'Enabled' }
});
```

---

## 🪚 L2 – "Efficient Tools"

* 💡 Provides friendly abstractions with helpful defaults (e.g. `versioned: true`).
* 🔒 Protects against common misconfigurations.
* ✅ Ideal for **most real-world use cases**.

```ts
// Level 2 Bucket – simple and safe
new s3.Bucket(this, 'SafeBucket', {
  versioned: true,
  removalPolicy: cdk.RemovalPolicy.DESTROY
});
```

---

## 🧠 L3 – "Prebuilt Solutions"

* 🧬 **Composed constructs** that encapsulate multiple resources and best practices.
* 🛠️ Perfect for prototyping fast or enforcing standard architectures.
* 😅 Can be too rigid if you need to tweak specific pieces.

```ts
// Deploy a static website with S3
new s3deploy.BucketDeployment(this, 'DeployWebsite', {
  sources: [s3deploy.Source.asset('./website')],
  destinationBucket: myBucket
});
```

---

## 📦 Bonus: Custom Constructs

* 🧩 You build your **own “Level 3”** construct tailored to your org.
* 👌 Great for reusability, consistency, and modular design.

```ts
export class MySecureBucket extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new s3.Bucket(this, 'Bucket', {
      encryption: s3.BucketEncryption.KMS_MANAGED,
      versioned: true,
    });
  }
}
```

---

## 🎯 When to Use Each Level?

```mermaid
flowchart TD
    idea[🎯 You have an idea] --> checkPattern{Exists in L2 or L3?}
    checkPattern -- Yes --> useL2L3[✅ Use L2/L3 construct]
    checkPattern -- No --> needControl{Do you need full control?}
    needControl -- Yes --> useL1[🛠️ Use L1 (Cfn...)]
    needControl -- No --> makeCustom[🧩 Build a Custom Construct]
```

---

## ✅ Quick Tips to Remember

* 🔧 L1 = *Low-level*, fine-grained, verbose.
* 🪛 L2 = *Standard*, productive, safe.
* 🏗️ L3 = *Opinionated*, powerful, but less flexible.
* 🔁 Custom = *Your company’s building blocks*, reusable and tailored.
---

### **References:**

- [AWS CDK Constructs Documentation](https://docs.aws.amazon.com/cdk/latest/guide/constructs.html)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/home.html)

---

[🔙 IAM Roles and Users 🛡️](./02-iam-roles-users.md) | [🏠 Index](../README.md) | [🔜 Practical Workflow 🔄](./04-workflow.md)

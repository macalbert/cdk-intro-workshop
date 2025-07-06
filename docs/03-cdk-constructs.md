# Session 3: CDK Constructs 🏗️

## **Levels** 📚

### **Level 1:** Direct AWS CloudFormation resources. 🛠️

- **Definition:** Direct representations of AWS CloudFormation resources. 📜
- **Benefits:**
  - Full control over resource properties. 🎛️
  - Ideal for advanced use cases requiring fine-grained customization. 🔍
- **Drawbacks:**
  - Requires detailed knowledge of CloudFormation syntax. 🧠
  - More verbose and error-prone. ⚠️

- **Example:**

  ```typescript
  const bucket = new s3.CfnBucket(this, 'MyBucket', {
    bucketName: 'my-bucket',
    versioningConfiguration: {
      status: 'Enabled'
    }
  });
  ```

### **Level 2:** Predefined patterns for common use cases. ✂️

- **Definition:** Predefined patterns for common use cases. 📦
- **Benefits:**
  - Simplifies resource creation with sensible defaults. 🛠️
  - Reduces boilerplate code. ✂️
  - Easier to use for developers new to AWS. 👩‍💻
- **Drawbacks:**
  - Limited flexibility compared to Level 1 constructs. 🔒

- **Example:**

  ```typescript
  const bucket = new s3.Bucket(this, 'MyBucket', {
    versioned: true,
    removalPolicy: cdk.RemovalPolicy.DESTROY
  });
  ```

### **Level 3:** Opinionated constructs for complex scenarios. 🤔

- **Definition:** Opinionated constructs for complex scenarios. 🏗️
- **Benefits:**
  - Encapsulates best practices for specific use cases. 🌟
  - Provides higher-level abstractions for complex workflows. 🔄
  - Great for rapid development and prototyping. 🚀
- **Drawbacks:**
  - Highly opinionated, may not fit all use cases. ⚠️

- **Example:**

  ```typescript
  const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
    websiteIndexDocument: 'index.html',
    publicReadAccess: true
  });
  ```

### **Custom Constructs:** Tailored constructs for specific needs. 🛠️

- **Definition:** User-defined constructs tailored to specific needs. 🧩
- **Benefits:**
  - Enables reusability and modularity. 🔄
  - Combines multiple resources into a single logical unit. 📦
  - Perfect for creating organization-specific patterns. 🌟
- **Drawbacks:**
  - Requires additional effort to design and implement. 🧠

- **Example:**

  ```typescript
  class CustomBucket extends Construct {
    constructor(scope: Construct, id: string) {
      super(scope, id);

      new s3.Bucket(this, 'MyCustomBucket', {
        versioned: true,
        encryption: s3.BucketEncryption.S3_MANAGED
      });
    }
  }
  ```

---

### **Duration:** 10 minutes ⏱️

---

### **Next Steps:**

- Discuss the differences between construct levels. 🗣️
- Provide examples for each level with practical use cases. 💡

---

### **References:**

- [AWS CDK Constructs Documentation](https://docs.aws.amazon.com/cdk/latest/guide/constructs.html)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/home.html)

---

[🔙 IAM Roles and Users 🛡️](./02-iam-roles-users.md) | [🏠 Index](../README.md) | [🔜 Practical Workflow 🔄](./04-workflow.md)

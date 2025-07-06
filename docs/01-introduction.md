# Session 1: Introduction to CDK 🚀

## **Why CDK?** 🤔

### **Advantages over Terraform** 🌟

- **AWS-first approach:**
  - CDK is designed to work seamlessly with AWS services, leveraging native integrations. 🛠️
  - Terraform is cloud-agnostic, which can lead to less optimized AWS workflows. 🌍

- **Objective benefits:**
  - **Robust testing capabilities:** CDK allows you to write unit tests for your infrastructure. ✅
  - **Resilience to changes:** CDK constructs are versioned and updated to reflect AWS best practices. 🔄
  - **Robust against external changes:**
    - CDK uses AWS CloudFormation to manage state, ensuring consistency even if resources are modified directly via the AWS Management Console, AWS CLI, or other tools. 🔄
    - Example: If versioning is disabled on an S3 bucket via the console or CLI, CDK will detect the drift and revert the bucket to match the code configuration during deployment.

- **Higher-level abstractions:**
  - CDK provides constructs that simplify infrastructure definition, reducing boilerplate code. ✂️
  - Example:

    ```typescript
    const bucket = new s3.Bucket(this, 'MyBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    ```

- **Object-Oriented Programming (OOP):**
  - CDK allows you to use OOP principles, such as inheritance and encapsulation, to structure your infrastructure code. 🧑‍💻
  - Terraform, on the other hand, is more script-based, relying on declarative syntax without OOP capabilities.

---

### **Duration:** 10 minutes ⏱️

---

### **Next Steps:**

- Discuss why CDK is better for AWS-first environments. 🗣️
- Highlight the advantages over Terraform with practical examples. 💡

---

### **References:**

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

[🔙 Introduction to CDK 🚀](./01-introduction.md) | [🏠 Index](../README.md) | [🔜 IAM Roles and Users 🛡️](./02-iam-roles-users.md)

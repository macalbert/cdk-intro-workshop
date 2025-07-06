# Session 2: IAM Roles and Users 🛡️

## **Introduction** 🧠

### **Roles vs Users:**

- **Users:**
  - Represent individuals (human access). 👩‍💻
  - Example: A developer accessing AWS Console. 🖥️

- **Roles:**
  - Represent entities (machine access). 🤖
  - Example: A Lambda function accessing S3. 📦
  - **Benefit:** When using roles, you don't need to hardcode access keys and secrets in your code. Resources can assume the role directly, simplifying security and reducing risks. 🔒

### **Practical Points:**

- **IAM Policies:**
  - Attach policies to roles or users to define permissions. 📝
  - Example:

    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": "s3:GetObject",
          "Resource": "arn:aws:s3:::example-bucket/*"
        }
      ]
    }
    ```

- **Best Practices:**
  - Use roles for machine access to avoid hardcoding credentials. 🛠️
  - Grant least privilege to users and roles. 🔑

---

### **Duration:** 10 minutes ⏱️

---

### **Next Steps:**

- Explain the differences between roles and users. 🗣️
- Provide practical examples and IAM policy configurations. 💡

---

### **References:**

- [AWS IAM Documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/home.html)

---

[🔙 Introduction to CDK 🚀](./01-introduction.md) | [🏠 Index](../README.md) | [🔜 CDK Constructs 🏗️](./03-cdk-constructs.md)

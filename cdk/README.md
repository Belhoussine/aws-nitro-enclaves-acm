# ACM for Nitro Enclaves Streamline

A CDK app that automates the installation and configuration of ACM for Nitro Enclaves on Amazon EC2 instances. This project simplifies the complex [manual installation process](https://docs.aws.amazon.com/enclaves/latest/user/install-acm.html) by providing both a simple CLI tool (`acmne-cli`) and three modular CDK stacks. 

## Architecture Overview
The app consists of **three** main CDK stacks:

![nitro_enclaves_acm_streamline](assets/images/nitro_enclaves_acm_streamline.svg)

### 1. Certificate Stack (Step 1)
**Can be bypassed by providing an `existingCertificateArn`**
#### Purpose:
- Provisions an ACM certificate (public/private) for a specified domain.
- Handles **domain validation** requirements ([automatic if Route53 is the DNS provider, otherwise needs to be done manually](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.CertificateValidation.html#static-fromwbrdnshostedzone))

#### Outputs:
- Domain Name
- Certificate ARN 

### 2. Role Stack (Steps 3, 4, 5)
#### Purpose:
- Creates and configures the ACM role.
- Associates the role with the certificate.
- Manages permissions for certificate and KMS key access.

#### Outputs:
- ACM Role Name and ARN
- Certificate S3 Bucket Name
- Certificate S3 Object Key
- Encryption KMS Key ID

### 3. Instance Stack (Steps 2, 6)
#### Purpose:
- Creates an enclave-enabled EC2 instance with:
    - Default VPC, public subnet and security group configuration.
    - Support for `NGINX` and `Apache` **server types**.
    - Support for `Amazon Linux 2 (AL2)` and `Amazon Linux 2023 (AL2023)` **AMI types**,
    - [**Nitro Enclave compatible instance types**](https://aws.amazon.com/ec2/nitro/nitro-enclaves/faqs/#:~:text=Which%20instance%20types%20are%20supported,with%20only%201%20CPU%20core.) only.
- Attaches instance profile with ACM role.
- Configures the web server to use ACM for Nitro Enclaves.

#### Outputs:
- Synthesized **SSH Connection String**
- Instance ID
- Instance Public IP
- Instance Public DNS Name
- Key Pair Name
- Server Type
- AMI Type

## Prerequisites
- NPM
- [AWS CDK CLI](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) installed & AWS credentials configured.
- Domain name, if creating a new certificate. Otherwise, the `existingCertificateArn` to bypass certificate creation.
- For **private certificates**: An AWS Private Certificate Authority (PCA)

## Quick Start
### Installation
```bash
git clone <repository-url>
cd aws-nitro-enclaves-acm/cdk
npm install
cdk bootstrap aws://<AWS_ACCOUNT>/<AWS_REGION>
chmod +x ./acmne-cli
```

### Usage
#### CLI Tool
Our custom CLI tool `acmne-cli` provides a simple one-line command to deploy the complete solution.

##### Example:
```bash
./acmne-cli \
  --aws-region <region> \
  --aws-account <account-id> \ 
  --is-private \
  --pca-arn <pca-arn> \
  --domain-name <your-domain> \
  --key-pair-name <key-pair-name> \
  --instance-type <instance-type> \
  --ami-type <AL2|AL2023> \
  --server-type <NGINX|APACHE>
```

For a complete list of `acmne-cli` options and their descriptions:
```bash
./acmne-cli -h
``` 

#### CDK CLI
For advanced deployment scenarios using [CDK CLI](https://docs.aws.amazon.com/cdk/v2/guide/cli.html)  directly, or for detailed configuration options, please refer to our [CDK Usage Guide](./docs/cdk-usage.md).

**Note:** All deployed stacks can be found in the [AWS CloudFormation console](https://console.aws.amazon.com/cloudformation/home), where you can:
- View detailed stack outputs
- Monitor stack events in real-time
- Manage stack lifecycle (update/delete)
- Track resource creation and deletion
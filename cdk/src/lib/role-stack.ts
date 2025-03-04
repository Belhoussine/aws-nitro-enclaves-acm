import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

import { Construct } from 'constructs';

/*
    Step 3 - Create the ACM role: https://docs.aws.amazon.com/enclaves/latest/user/install-acm.html#create-role
    Step 4 - Associate the certificate with the ACM role: https://docs.aws.amazon.com/enclaves/latest/user/install-acm.html#role-cert
    Step 5 - Grant the ACM role permission to access the certificate and encryption key: https://docs.aws.amazon.com/enclaves/latest/user/install-acm.html#add-policy
*/

interface RoleStackProps extends cdk.StackProps {
    roleName?: string;
    certificateArns: string[];
}

export class RoleStack extends cdk.Stack {
    public readonly instanceProfile: iam.InstanceProfile;

    constructor(scope: Construct, id: string, props?: RoleStackProps) {
        super(scope, id, props);

        // Step 3 - Create the ACM role
        const role = new iam.Role(this, props?.roleName!, {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        });

        // Step 4 - Associate all the certificates with the ACM role
        const certificateAssociations = props?.certificateArns.map((certArn, index) => {
            return new ec2.CfnEnclaveCertificateIamRoleAssociation(this, `EnclaveCertificateIamRoleAssociation-${index}`, {
                certificateArn: certArn,
                roleArn: role.roleArn,
            });
        });

        // Step 5 - Grant the ACM role permission to access the certificate and encryption key
        certificateAssociations?.forEach((association, index) => {
            // Grant S3 access for certificate
            role.addToPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['s3:GetObject'],
                resources: [`arn:aws:s3:::${association.attrCertificateS3BucketName}/*`],
            }));

            // Grant KMS access for certificate
            role.addToPolicy(new iam.PolicyStatement({
                sid: `VisualEditor${index}`,
                effect: iam.Effect.ALLOW,
                actions: ['kms:Decrypt'],
                resources: [`arn:aws:kms:${props?.env?.region}:*:key/${association.attrEncryptionKmsKeyId}`],
            }));
        });

        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['iam:GetRole'],
            resources: [role.roleArn],
        }));

        // Create Instance Profile from the role
        const instanceProfile = new iam.InstanceProfile(this, `AcmneInstanceProfile`, { role: role });

        // Populate instanceProfile to pass it to external stacks
        this.instanceProfile = instanceProfile;

        // Role outputs
        new cdk.CfnOutput(this, 'ACMRoleName', { value: role.roleName });
        new cdk.CfnOutput(this, 'ACMRoleArn', { value: role.roleArn });

        // ACM Certificate / Role association outputs for each certificate
        certificateAssociations?.forEach((association, index) => {
            new cdk.CfnOutput(this, `CertificateS3BucketName-${index}`, { value: association.attrCertificateS3BucketName });
            new cdk.CfnOutput(this, `CertificateS3ObjectKey-${index}`, { value: association.attrCertificateS3ObjectKey });
            new cdk.CfnOutput(this, `EncryptionKmsKeyId-${index}`, { value: association.attrEncryptionKmsKeyId });
        });
    }
}




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
    certificateArn: string;
    region: string;
}

export class RoleStack extends cdk.Stack {
    public readonly roleArn: string;

    constructor(scope: Construct, id: string, props?: RoleStackProps) {
        super(scope, id, props);

        // Props validation 
        if (!props?.certificateArn) {
            throw new Error('certificateArn is required in RoleStack.');
        }
        if (!props?.region) {
            throw new Error('region is required in RoleStack.');
        }

        // Step 3 - Create the ACM role 
        const role = new iam.Role(this, props?.roleName || 'AcmRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            // roleName: props?.roleName || 'AcmRole',
        });

        // Step 4 - Associate the certificate with the ACM role
        const enclaveCertificateIamRoleAssociation = new ec2.CfnEnclaveCertificateIamRoleAssociation(this, `EnclaveCertificateIamRoleAssociation-${props.roleName}`, {
            certificateArn: `${props?.certificateArn!}`,
            roleArn: `${role.roleArn}`,
        });

        // Step 5 - Grant the ACM role permission to access the certificate and encryption key
        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:GetObject'],
            resources: [`arn:aws:s3:::${enclaveCertificateIamRoleAssociation.attrCertificateS3BucketName}/*`],
        }));

        role.addToPolicy(new iam.PolicyStatement({
            sid: 'VisualEditor0',
            effect: iam.Effect.ALLOW,
            actions: ['kms:Decrypt'],
            resources: [`arn:aws:kms:${props?.region}:*:key/${enclaveCertificateIamRoleAssociation.attrEncryptionKmsKeyId}`],
        }));

        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['iam:GetRole'],
            resources: [`${role.roleArn}`],
        }));

        // Populating roleArn to pass it to external stacks
        this.roleArn = role.roleArn;

        // Role outputs
        new cdk.CfnOutput(this, 'ACMRoleName', { value: role.roleName });
        new cdk.CfnOutput(this, 'ACMRoleArn', { value: role.roleArn });

        // ACM Certificate / Role association outputs
        new cdk.CfnOutput(this, 'CertificateS3BucketName', { value: enclaveCertificateIamRoleAssociation.attrCertificateS3BucketName });
        new cdk.CfnOutput(this, 'CertificateS3ObjectKey', { value: enclaveCertificateIamRoleAssociation.attrCertificateS3ObjectKey });
        new cdk.CfnOutput(this, 'EncryptionKmsKeyId', { value: enclaveCertificateIamRoleAssociation.attrEncryptionKmsKeyId });
    }
}




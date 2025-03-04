// config/default-config.ts
import { NitroEnclavesAcmStreamlineConfig } from './types';

require('dotenv').config();

export const getDefaultConfig = (): NitroEnclavesAcmStreamlineConfig => ({
  // Certificate Configuration
  certificateConfig: {
    stackName: 'CertificateStack',
    certificates: [
      {
        certificateName: 'AcmneCertificate1',
        domainName: process.env.DOMAIN_NAME_1 || 'example1.com',
        isPrivate: true,
        // If using an existing ACM certificate
        // existingCertificateArn: process.env.CERTIFICATE_ARN || 'arn:aws:acm:my-region-1:123456789:certificate/xxx-yyyy',

        // If creating a public certificate
        // hostedZoneId: process.env.HOSTED_ZONE_ID || 'Z123456789', // If Route53 is the DNS provider
        // validationType: 'DNS', // If using an external DNS provider

        // If creating a private certificate
        pcaArn: process.env.PCA_ARN || 'arn:aws:acm-pca:us-east-1:123456789:certificate-authority/xxx-yyyy',
      },
      {
        certificateName: 'AcmneCertificate2',
        domainName: process.env.DOMAIN_NAME_2 || 'example2.com',
        isPrivate: true,
        pcaArn: process.env.PCA_ARN || 'arn:aws:acm-pca:us-east-1:123456789:certificate-authority/xxx-yyyy',
      },
      // Add more certificates as needed
    ],
  },

  // Role Configration
  roleConfig: {
    stackName: 'RoleStack',
    roleName: 'AcmneRole',
  },

  // Instance Configuration
  instanceConfig: {
    stackName: 'InstanceStack',
    instanceName: 'AcmneInstance',
    keyPairName: process.env.KEY_PAIR_NAME || 'my-key-pair-name',
    serverType: 'NGINX',
    amiType: 'AL2023',
    instanceType: 'c5.xlarge',
    encryptVolume: false,
    allowSSHPort: false,
  },
  region: process.env.AWS_REGION || 'us-east-1',
  account: process.env.AWS_ACCOUNT || '123456789',
});

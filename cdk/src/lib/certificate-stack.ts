import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acmpca from 'aws-cdk-lib/aws-acmpca';
import { Construct } from 'constructs';

import { CertificateConfig } from '../config/types';

/*
  Step 1 - Create the ACM certificate: https://docs.aws.amazon.com/enclaves/latest/user/install-acm.html#create-cert
*/

interface CertificateStackProps extends cdk.StackProps {
  certificates: CertificateConfig[]
}

export class CertificateStack extends cdk.Stack {
  public readonly certificateArns: string[];

  constructor(scope: Construct, id: string, props?: CertificateStackProps) {
    super(scope, id, props);

    this.certificateArns = [];

    // Create certificates based on configuration
    props?.certificates.forEach((certConfig: CertificateConfig, index) => {

      let certificate = null;

      // Provision a public certificate
      if (!certConfig?.isPrivate) {
        // If route53 is the DNS provider, validation is done automatically
        if (certConfig?.hostedZoneId) {
          const hostedZone = route53.HostedZone.fromHostedZoneId(this, `HostedZone-${index}`, certConfig?.hostedZoneId!);
          certificate = new acm.Certificate(this, certConfig?.certificateName!, {
            domainName: certConfig?.domainName!,
            validation: acm.CertificateValidation.fromDns(hostedZone),
          });
        } else {
          certificate = new acm.Certificate(this, certConfig?.certificateName!, {
            domainName: certConfig?.domainName!,
            validation: certConfig?.validationType === 'DNS' ? acm.CertificateValidation.fromDns() : acm.CertificateValidation.fromEmail(),
          });
        }
      } else {
        certificate = new acm.PrivateCertificate(this, certConfig?.certificateName!, {
          domainName: certConfig?.domainName!,
          certificateAuthority: acmpca.CertificateAuthority.fromCertificateAuthorityArn(this, `CertificateAuthority-${index}`, certConfig?.pcaArn!),
        });
      }

      this.certificateArns.push(certificate.certificateArn);

      new cdk.CfnOutput(this, `CertificateArn-${index}`, { value: certificate.certificateArn });
      new cdk.CfnOutput(this, `DomainName-${index}`, { value: certConfig!.domainName });
    });
  }
}

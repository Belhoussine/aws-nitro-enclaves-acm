import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs';
import { readFileSync } from 'fs';

import { CertificateConfig } from '../config/types';

/*
  Step 2 - Prepare the enclave-enabled parent instance: https://docs.aws.amazon.com/enclaves/latest/user/install-acm.html#prepare-instance
  Step 6 - Attach the role to the instance: https://docs.aws.amazon.com/enclaves/latest/user/install-acm.html#instance-role
*/

interface InstanceStackProps extends cdk.StackProps {
  instanceName?: string;
  instanceProfile: iam.InstanceProfile;
  keyPairName: string;
  serverType: 'NGINX' | 'APACHE';
  amiType: 'AL2' | 'AL2023';
  instanceType: string;
  certificates: CertificateConfig[];
  encryptVolume: boolean;
  allowSSHPort: boolean;
}

export class InstanceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InstanceStackProps) {
    super(scope, id, props);

    // Step 2: Prepare the enclave-enabled parent instance
    const vpc = ec2.Vpc.fromLookup(this, `DefaultVPC-${props.instanceName}`, { isDefault: true })

    const securityGroup = new ec2.SecurityGroup(this, `InstanceSecurityGroup-${props.instanceName}`, {
      vpc,
      description: 'Allow SSH (TCP port 22) and HTTP/HTTPS (TCP ports 80/443) in',
      allowAllOutbound: true
    });

    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP Access');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS Access');
    if (props.allowSSHPort) {
      securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH Access');
    }

    // Configure user data (startup commands) based on AMI type and server type
    const userData = this.getUserData(props)
    console.log(userData)

    // Configure instance type
    const instanceType = new ec2.InstanceType(props.instanceType);
    const isArm = instanceType.architecture === ec2.InstanceArchitecture.ARM_64;

    // Configure AMI
    const machineImage = new ec2.AmazonLinuxImage({
      generation: props?.amiType === 'AL2'
        ? ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
        : ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
      cpuType: isArm
        ? ec2.AmazonLinuxCpuType.ARM_64
        : ec2.AmazonLinuxCpuType.X86_64
    });

    // Step 2 & Step 6 - Create the enclave-enabled instance with the attached role/instance profile
    const instance = new ec2.Instance(this, props?.instanceName!, {
      instanceType: instanceType,
      machineImage: machineImage,
      vpc: vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: securityGroup,
      keyPair: ec2.KeyPair.fromKeyPairName(this, `KeyPair-${props.instanceName}`, props?.keyPairName!),
      instanceProfile: props.instanceProfile,
      enclaveEnabled: true,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(
            8, // Default volume size
            {
              encrypted: props.encryptVolume,
            }
          ),
        },
      ],
      userData: userData
    });

    // Outputs: Instance Information
    new cdk.CfnOutput(this, 'InstanceId', { value: instance.instanceId });
    new cdk.CfnOutput(this, 'InstancePublicIP', { value: instance.instancePublicIp });
    new cdk.CfnOutput(this, 'InstancePublicDnsName', { value: instance.instancePublicDnsName });
    new cdk.CfnOutput(this, 'keyPairName', { value: props?.keyPairName });
    new cdk.CfnOutput(this, 'serverType', { value: props?.serverType })
    new cdk.CfnOutput(this, 'amiType', { value: props?.amiType })
    new cdk.CfnOutput(this, 'SSH connection string', { value: `ssh -i ${props?.keyPairName!}.pem ec2-user@${instance.instancePublicDnsName}` });
    // Output certificate information
    props.certificates.forEach((cert, index) => {
      new cdk.CfnOutput(this, `Certificate-${index}`, {
        value: `Domain: ${cert.domainName}, Private: ${cert.isPrivate}`
      });
    });
  }

  // Get commands for user data
  private getUserData(props: InstanceStackProps, baseFolder: string = 'src/assets/user-data-scripts'): ec2.UserData {
    const userData = ec2.UserData.forLinux()
    let combinedConfig = '';
    const userDataScriptsFolder = `${baseFolder}/${props.amiType}/${props.serverType}`

    // Add install dependencies script
    combinedConfig += readFileSync(`${userDataScriptsFolder}/install-dependencies.sh`, 'utf8');

    // Add ACM base configuration in /etc/nitro_enclaves/acm.yaml
    combinedConfig += readFileSync(`${userDataScriptsFolder}/acm/base.sh`, 'utf8');

    // Update web server config
    combinedConfig += readFileSync(`${userDataScriptsFolder}/conf/base.sh`, 'utf8')
      .replaceAll('DOMAIN_NAME_PLACEHOLDER', props.certificates.map(c => c.domainName).join(' '))

    props.certificates.forEach((cert, index) => {
      // Add label for each certificate in /etc/nitro_enclaves/acm.yaml file
      combinedConfig += readFileSync(`${userDataScriptsFolder}/acm/label.sh`, 'utf8')
      .replaceAll('CERTIFICATE_ARN_PLACEHOLDER', cert.existingCertificateArn!)
      .replaceAll('INDEX_PLACEHOLDER', `${index + 1}`);

      // Update web server config
      combinedConfig += readFileSync(`${userDataScriptsFolder}/conf/stanza.sh`, 'utf8')
      .replaceAll('DOMAIN_NAME_PLACEHOLDER', cert.domainName)
      .replaceAll('INDEX_PLACEHOLDER', `${index + 1}`);

      // Add domainName to /etc/hosts if private cert
      if (cert.isPrivate) {
        combinedConfig += readFileSync(`${baseFolder}/private-cert-conf.sh`, 'utf8')
          .replaceAll('DOMAIN_NAME_PLACEHOLDER', cert.domainName);
      }
    });

    // Add OpenSSL configuration
    combinedConfig += readFileSync(`${userDataScriptsFolder}/openssl-conf.sh`, 'utf8');

    // Start ACM service
    combinedConfig += readFileSync(`${baseFolder}/start-acm-service.sh`, 'utf8') ;

    userData.addCommands(...combinedConfig.split('\n'))

    return userData
  }
}
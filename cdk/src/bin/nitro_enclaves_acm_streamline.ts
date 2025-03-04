#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CertificateStack } from '../lib/certificate-stack';
import { RoleStack } from '../lib/role-stack';
import { InstanceStack } from '../lib/instance-stack';
import { getDefaultConfig } from '../config/default-config';
import { ConfigValidator } from '../config/config-validator';
import { NitroEnclavesAcmStreamlineConfig, CertificateConfig } from '../config/types';
import { Certificate } from 'crypto';

require('dotenv').config();

export class NitroEnclavesAcmStreamline {
  private readonly app: cdk.App;
  private readonly config: NitroEnclavesAcmStreamlineConfig;
  private readonly isDestroySubcommand: boolean;
  private certificates: CertificateConfig[] = [];

  constructor(config: NitroEnclavesAcmStreamlineConfig, isDestroySubcommand: boolean = false) {
    this.app = new cdk.App();
    this.config = config;
    this.isDestroySubcommand = isDestroySubcommand;
    ConfigValidator.validateEnv(this.config, this.isDestroySubcommand);
  }

  private createCertificateStack(): void {
    // Handle existing certificates first
    this.config.certificateConfig.certificates.forEach(certConfig => {
      if (certConfig.existingCertificateArn) {
        this.certificates.push({
          existingCertificateArn: certConfig.existingCertificateArn,
          domainName: certConfig.domainName,
          isPrivate: certConfig.isPrivate,
        })
      }
    });

    // Create new certificates if needed
    const certificatesToCreate = this.config.certificateConfig.certificates.filter(
      cert => !cert.existingCertificateArn
    );

    if (certificatesToCreate.length > 0) {
      ConfigValidator.validateCertificateStack(this.config, this.isDestroySubcommand);
      
      const certificateStack = new CertificateStack(
        this.app,
        this.config.certificateConfig.stackName || 'CertificateStack',
        {
          env: this.getEnv(),
          certificates: certificatesToCreate
        }
      );

      // Add newly created certificates to the certificates array
      certificateStack.certificateArns.forEach((arn, index) => {
        this.certificates.push({
          existingCertificateArn: arn,
          domainName: certificatesToCreate[index].domainName,
          isPrivate: certificatesToCreate[index].isPrivate
        });
      });
    }
  }

  private createRoleStack(): RoleStack {
    ConfigValidator.validateRoleStack(this.config, this.isDestroySubcommand);
    return new RoleStack(
      this.app,
      this.config.roleConfig?.stackName || 'RoleStack',
      {
        env: this.getEnv(),
        certificateArns: this.certificates.map(cert => cert.existingCertificateArn!),
        roleName: this.config.roleConfig?.roleName || 'AcmneRole',
      });
  }

  private createInstanceStack(roleStack: RoleStack): InstanceStack {
    ConfigValidator.validateInstanceStack(this.config, this.isDestroySubcommand);
    return new InstanceStack(
      this.app,
      `${this.config.instanceConfig.stackName}` || `InstanceStack`,
      {
        env: this.getEnv(),
        instanceProfile: roleStack.instanceProfile,
        keyPairName: this.config.instanceConfig.keyPairName,
        serverType: this.config.instanceConfig.serverType,
        amiType: this.config.instanceConfig.amiType,
        instanceType: this.config.instanceConfig.instanceType,
        instanceName: this.config.instanceConfig.instanceName || 'AcmneInstance',
        certificates: this.certificates,
        encryptVolume: this.config.instanceConfig.encryptVolume,
        allowSSHPort: this.config.instanceConfig.allowSSHPort,
      }
    );
  }

  private getEnv(): { account: string; region: string } {
    return {
      account: this.config.account,
      region: this.config.region
    };
  }

  public deploy(): void {
    this.createCertificateStack();
    const roleStack = this.createRoleStack();
    const instanceStack = this.createInstanceStack(roleStack);
    instanceStack.addDependency(roleStack);
  }
}

const streamline = new NitroEnclavesAcmStreamline(getDefaultConfig());
streamline.deploy();

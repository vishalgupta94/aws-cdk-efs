#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsCdkEfsStack } from '../lib/aws-cdk-efs-stack';
import { AwsBasicVPCEndpoint } from '../lib/stacks/aws-basic-vpc-endpoint';


const app = new cdk.App();

// new AwsCdkEfsStack(app, 'AwsCdkEfsStack', {
//   env: { account: '339713054130', region: 'ap-south-1' },
// });

new AwsBasicVPCEndpoint(app, 'AwsBasicVPCEndpoint', {
  env: { account: '339713054130', region: 'ap-south-1' },
});

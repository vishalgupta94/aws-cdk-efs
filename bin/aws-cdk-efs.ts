#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsCdkEfsStack } from '../lib/aws-cdk-efs-stack';
import { AwsBasicVPCEndpoint } from '../lib/stacks/aws-basic-vpc-endpoint';
import { BasicFargate } from '../lib/stacks/fargate-stacks/basic-fargate';


const app = new cdk.App();

// new AwsBasicVPCEndpoint(app, 'AwsBasicVPCEndpoint', {
//   env: { account: '339713054130', region: 'ap-south-1' },
// });

new BasicFargate(app, 'BasicFargate-Stack', {
  env: { account: '339713054130', region: 'ap-south-1' },
});



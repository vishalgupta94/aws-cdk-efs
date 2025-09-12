#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
import { RedisStack } from '../lib/redis-stack';

const app = new cdk.App();
// const infraStack = new InfraStack(app, 'InfraStack', {
//    env: {
//     account: '339713054130',
//     region: 'ap-south-1'
//    },
//    description: "Vishal test to learn Fargate"
// });

const redisStack = new RedisStack(app, 'ExpressStack3', {
   env: {
    account: '339713054130',
    region: 'ap-south-1'
   }
});
import * as cdk from 'aws-cdk-lib';
import { Peer, Port, SecurityGroup, Vpc, SubnetSelection, InterfaceVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage, FargateTaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { Repository,  } from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { join } from 'path';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { EcsFargateLaunchTarget, EcsRunTask } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';


export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sqsQueue = new Queue(this,"Queue",{
      queueName: "vishal-test-demo-queue"
    })
    sqsQueue.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

    const vpc = new Vpc(this, 'Vpc',{
      maxAzs: 1,
      enableDnsHostnames: true,
      enableDnsSupport:true,
      natGateways: 0,
    
    })
    vpc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

    const sqsSG = new SecurityGroup(this,"InterfaceENdpoint",{
      vpc,
      securityGroupName: "SQSInterfaceENdpoint",
    })

    sqsSG.addIngressRule(Peer.anyIpv4(),Port.allTraffic())

    const lambda = new NodejsFunction(this, 'Infra-Lambda', {
      vpc,
      vpcSubnets: { subnets: vpc.isolatedSubnets },
      handler: 'handler',
      entry: join(process.cwd(), './lib/lambda2/index.ts'),
      securityGroups: [sqsSG]
    })
    sqsQueue.grantSendMessages(lambda)
    lambda.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)


    const sqsInterfaceEndpoint = vpc.addInterfaceEndpoint("SQSInterfaceEndpoint",{
      service: InterfaceVpcEndpointAwsService.SQS,
      securityGroups: [sqsSG],
      open: true,
      subnets:  { subnets: vpc.isolatedSubnets },
      privateDnsEnabled: false
    })

    sqsInterfaceEndpoint.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)
    const fargateCluster = new Cluster(this, 'Infra-FargateCluster', {
      vpc: vpc,
      clusterName: 'Infra-FargateCluster'
    })
    fargateCluster.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

    // If you want to talk to Dynamodb, taskRole 
    const taskRole = new Role(this, 'Infra-TaskRole', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
    })
    taskRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this,"AmazonS3FullAccess",
      "arn:aws:iam::aws:policy/AmazonS3FullAccess"
    ),) 

    taskRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this,"taskRole-PowerUser",
      "arn:aws:iam::aws:policy/PowerUserAccess"
    ),)  
    taskRole.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)
    // For ECS agent to pick up image from ECR, we need TaskExection Role.
    const taskExecutionRole = new Role(this, 'Infra-IamRole', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),

    })    
    taskExecutionRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(
      'service-role/AmazonECSTaskExecutionRolePolicy'
    ),)
    taskExecutionRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this,"PowerUser",
      "arn:aws:iam::aws:policy/PowerUserAccess"
    ),)    
    taskExecutionRole.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)
    
    const image = ContainerImage.fromAsset(join(process.cwd(), './docker-images/basic-express'), {
    });
    

    const taskDefinition = new FargateTaskDefinition(this, 'Basic-FargateTaskDefinition');

    taskDefinition.addContainer('basic-image', {
      image: image,
      portMappings:  [{
        containerPort: 3000,        
      }],
      environment: {
        "SQS_QUEUE": sqsQueue.queueUrl,
        "SQS_ENDPOINT_ID": sqsInterfaceEndpoint.vpcEndpointId,
        // "SQS_ENDPOINT_ID": sqsInterfaceEndpoint.vpcEndpointDnsEntries,
      },  
    });  
    taskDefinition.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)  
    
    const sbasicSG = new SecurityGroup(this,"basicSG", {
      vpc,
      allowAllOutbound: false
    })
    
    sbasicSG.addIngressRule(Peer.anyIpv4(),Port.tcp(3000))
    sbasicSG.addEgressRule(Peer.anyIpv4(),Port.tcp(80))
    sbasicSG.addEgressRule(Peer.anyIpv4(),Port.tcp(443))

    sbasicSG.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)  


  }
}


/*
Tasks
Understand single nat gateway provider
*/

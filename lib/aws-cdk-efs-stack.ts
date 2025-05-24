import * as cdk from 'aws-cdk-lib';
import { Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, LogDriver } from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
import { getRoles } from './helpers';
import { join } from 'path';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsCdkEfsStack extends cdk.Stack {
  private cluster: Cluster
  private vpc: Vpc
  private taskRole;
  private taskExecutionRole;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.createClusterAndVpc()
    const { taskRole, taskExecutionRole } = getRoles(this);
    this.taskExecutionRole = taskExecutionRole;
    this.taskRole = taskRole;

    this.createFargateService()
    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'AwsCdkEfsQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }

  createFargateService(){
    const mongoExpress = ContainerImage.fromAsset(join(process.cwd(), './lib/basic-mongo'), {
    });

    const mongoImage = ContainerImage.fromRegistry("mongo")

    const taskDefination = new FargateTaskDefinition(this, "FargateTaskDefinition",{
      executionRole: this.taskExecutionRole,
      taskRole: this.taskRole,
    })

    taskDefination.addContainer('basic-image', {
        image: mongoExpress,
        portMappings: [{
            containerPort: 3005,
        }],
        environment: {
          MONGO_URL: "mongodb://localhost:27017/myappdb"
        },
        logging: LogDriver.awsLogs({
          streamPrefix: "mongo-express"
      }),
    });

    taskDefination.addContainer('mongo', {
      image: mongoImage,
      portMappings: [{
          containerPort: 27017,
      }],
      logging: LogDriver.awsLogs({
        streamPrefix: "mongo"
      }), 
      
  });

    taskDefination.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);


    const securityGroup = new SecurityGroup(this, "SecurityGroup", {
      vpc: this.vpc
    })
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(3005))

    securityGroup.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const service = new FargateService(this,"fargateService", {
      cluster: this.cluster,
      taskDefinition: taskDefination,
      assignPublicIp: true,
      desiredCount: 2,
      securityGroups: [securityGroup]
    })
  }

  createClusterAndVpc(){

    this.vpc = new Vpc(this,"Vpc",{
      maxAzs: 1
    })
    this.vpc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

    this.cluster = new Cluster(this,"Cluster",{
        vpc: this.vpc
    })
    this.cluster.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)
  }
}

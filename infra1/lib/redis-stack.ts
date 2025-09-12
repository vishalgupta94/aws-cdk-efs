import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { FlowLog, FlowLogDestination, FlowLogResourceType, Peer, Port, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, LogDriver, } from "aws-cdk-lib/aws-ecs";
import { LoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancing";
import { Protocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup, NetworkLoadBalancer, NetworkTargetGroup } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { HealthCheck, PrivateHostedZone } from "aws-cdk-lib/aws-route53";
import { DnsRecordType, PrivateDnsNamespace } from "aws-cdk-lib/aws-servicediscovery";
import { LoadBalancerListenerProtocol } from "aws-cdk-lib/cloud-assembly-schema";
import { CfnResolverQueryLoggingConfig, CfnResolverQueryLoggingConfigAssociation} from 'aws-cdk-lib/aws-route53resolver'
import { Construct } from "constructs";
import { join, resolve } from "path";
import { mongoService } from "./services/mongo-express";
import { mongoExpressLb } from "./load-balancer/mongo-express.lb";
import { EfsVolume } from "aws-cdk-lib/aws-batch";
import { FileSystem, LifecyclePolicy } from "aws-cdk-lib/aws-efs";
import { Bucket } from "aws-cdk-lib/aws-s3";
//   create-resolver-query-log-config

export class RedisStack extends Stack {
    private vpc: Vpc;
    private fargateCluster: Cluster;
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.createVPCAndFargateCluster()

        const { taskRole, taskExecutionRole } = this.getRoles()
        // const redisTaskDefinition = this.getRedisTaskDefinition(taskRole, taskExecutionRole)
        // const redisTaskDefinitionWithHealthCheck = this.getRedisTaskDefinitionWithHealthCheck(taskRole, taskExecutionRole)

        // const fargateSG = new SecurityGroup(this, "InterfaceENdpoint", {
        //     vpc: this.vpc,
        //     securityGroupName: "Service-SG",
        // })

        // fargateSG.addIngressRule(Peer.anyIpv4(), Port.allTraffic())
        // fargateSG.applyRemovalPolicy(RemovalPolicy.DESTROY)
        // const redisServiceHealthCheck = this.createRedisServiceWithHealthCheck(redisTaskDefinitionWithHealthCheck, fargateSG)
        // this.createLoadBalancer(redisServiceHealthCheck)

        // const expressTaskDefination = this.getExpressTaskDefination(taskRole, taskExecutionRole)
        // const expressSG = new SecurityGroup(this, "expressSG", {
        //     vpc: this.vpc,
        // })

        // expressSG.addIngressRule(Peer.anyIpv4(), Port.allTraffic())
        // expressSG.applyRemovalPolicy(RemovalPolicy.DESTROY)
        // const expressService = this.createExpressService(expressTaskDefination,expressSG)
        // this.enableNameSpace(expressService)

        // this.createExpressLoadBalancer(expressService)


        const lambda = new NodejsFunction(this,"lambda2",{
            handler: "handler",
            vpc: this.vpc,
            vpcSubnets: {
                subnets: this.vpc.privateSubnets
            },
            entry: resolve(
                process.cwd(),
                './lib/lambda2/index.ts'
              )
        })
        lambda.applyRemovalPolicy(RemovalPolicy.DESTROY)
        
        const efsSG = new SecurityGroup(this, "InterfaceENdpoint", {
            vpc: this.vpc,
            securityGroupName: "Service-SG",
        })

        efsSG.addIngressRule(Peer.anyIpv4(), Port.allTraffic())
        efsSG.addEgressRule(Peer.anyIpv4(), Port.allTraffic())
        efsSG.applyRemovalPolicy(RemovalPolicy.DESTROY);

        const fileSystem = new FileSystem(this, 'MyEfsFileSystem', {
            vpc:this.vpc,
            lifecyclePolicy: LifecyclePolicy.AFTER_1_DAY,
            securityGroup: efsSG,
            vpcSubnets: {
                subnets: this.vpc.privateSubnets
            },
            encrypted: false,
            allowAnonymousAccess: false
          });
          
          fileSystem.applyRemovalPolicy(RemovalPolicy.DESTROY)

        const mongodbTaskDefination = this.getMongodbTaskDefination(taskRole, taskExecutionRole,fileSystem)

        const mongoExpressService = mongoService({
            cluster: this.fargateCluster,
            scope: this,
            taskDefinition: mongodbTaskDefination ,
            vpc: this.vpc
        })

        // mongoExpressLb({
        //     scope: this,
        //     service: mongoExpressService,
        //     vpc: this.vpc
        // })

    }

    private getMongodbTaskDefination(taskRole: Role, taskExecutionRole: Role,fileSystem: FileSystem) {
        const expressImage = ContainerImage.fromAsset(join(process.cwd(), './docker-images/mongo'), {
        });
        fileSystem.addAccessPoint("abcd", {

        })
        const mongodbTaskDefination = new FargateTaskDefinition(this, 'Redis-TaskDefination', {
            taskRole,
            executionRole: taskExecutionRole,
            volumes: [{
                 name: "data",
                 efsVolumeConfiguration: {
                    fileSystemId: fileSystem.fileSystemId,
                    rootDirectory: '/',                    
                 }
            }]
        });

        mongodbTaskDefination.addContainer('basic-express-image', {
            image: expressImage,
            portMappings: [{
                containerPort: 3000,
            }],
            logging: LogDriver.awsLogs({
                streamPrefix: "express"
            }),

        });



        const constainerDefination = mongodbTaskDefination.addContainer('mongo', {
            image: ContainerImage.fromRegistry("mongo:latest"),
            portMappings: [{
                containerPort: 27017,
            }],
            logging: LogDriver.awsLogs({
                streamPrefix: "mongo"
            }),
            environment: {
                MONGO_INITDB_ROOT_USERNAME: "root",
                MONGO_INITDB_ROOT_PASSWORD: "example"
            },

        });

        constainerDefination.addMountPoints({
            containerPath: "/data/db",
            readOnly: false,
            sourceVolume: "data"
        })
        mongodbTaskDefination.node.addDependency(fileSystem)
        mongodbTaskDefination.applyRemovalPolicy(RemovalPolicy.DESTROY)
        return mongodbTaskDefination
    }

    private enableNameSpace(fargateService: FargateService){
        // const logConfig2 = new CfnResolverQueryLoggingConfig(this,"logCOnfig2",{
        //     destinationArn: "arn:aws:s3:::fuse-vishal-ref-app-123321/vpc",
        //     name: "test-assoicate2",
        // })
        // const associate2 = new CfnResolverQueryLoggingConfigAssociation(this,"assoicate2",{
        //     resourceId: this.vpc.vpcId,
        //     resolverQueryLogConfigId: logConfig2.attrId
        // })

        const namespace = new PrivateDnsNamespace(this, 'Namespace', {
            name: 'boobar.com',
            vpc: this.vpc,
          });

        namespace.applyRemovalPolicy(RemovalPolicy.DESTROY)

        fargateService.enableCloudMap({
            cloudMapNamespace: namespace,
            dnsRecordType: DnsRecordType.A,
            name: "vishal-service"
        })

        namespace.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }
    
    private createExpressLoadBalancer(sg: FargateService){

        const albSG = new SecurityGroup(this, "SecurityGroup-ALB", {
            vpc: this.vpc,
        })

        albSG.addIngressRule(Peer.anyIpv4(), Port.allTraffic())
        albSG.applyRemovalPolicy(RemovalPolicy.DESTROY)

        const alb = new ApplicationLoadBalancer(this,"alb",{
            vpc: this.vpc,
            internetFacing: true,
            crossZoneEnabled: true,
            securityGroup: albSG,
            vpcSubnets: {
                subnets: this.vpc.publicSubnets
            }
        })
        alb.applyRemovalPolicy(RemovalPolicy.DESTROY)

        const httpListner = alb.addListener("http-listener",{
            port: 80,
            protocol: ApplicationProtocol.HTTP
        })
        httpListner.applyRemovalPolicy(RemovalPolicy.DESTROY)
    
        httpListner.addTargets("http-target",{
            port: 3000,
            protocol: ApplicationProtocol.HTTP,
            targets: [sg],
            stickinessCookieName: "session_id",
            stickinessCookieDuration: Duration.days(1),
            targetGroupName: "express-base-tg",
        }) 
        new CfnOutput(this, "ALB-DNS", {
            value: alb.loadBalancerDnsName
        })
    }

    private createExpressService(taskDefinition: FargateTaskDefinition, sg: SecurityGroup){
        const expressService = new FargateService(this, "redisService", {
            cluster: this.fargateCluster,
            vpcSubnets: {
                subnets: this.vpc.privateSubnets
            },
            taskDefinition,
            serviceName: 'express-service',
            securityGroups: [sg],
            desiredCount: 3,
        })
        expressService.applyRemovalPolicy(RemovalPolicy.DESTROY)
        return expressService
    }
    private getExpressTaskDefination(taskRole: Role, taskExecutionRole: Role){
        const expressImage = ContainerImage.fromAsset(join(process.cwd(), './docker-images/basic-express'), {
        });

        const expressTaskDefinition = new FargateTaskDefinition(this, 'Express-TaskDefination', {
            taskRole,
            executionRole: taskExecutionRole,
            
        });

        expressTaskDefinition.addContainer('basic-image', {
            image: expressImage,
            portMappings: [{
                containerPort: 3000,
            }],
            logging: LogDriver.awsLogs({
                streamPrefix: "vishal-logs"
            })
        });
        expressTaskDefinition.applyRemovalPolicy(RemovalPolicy.DESTROY)
        return expressTaskDefinition
    }

    private createLoadBalancer(service: FargateService) {
        const nlbSG = new SecurityGroup(this, "SecurityGroup-NLB", {
            vpc: this.vpc,
        })

        nlbSG.addIngressRule(Peer.anyIpv4(), Port.allTraffic())
        nlbSG.applyRemovalPolicy(RemovalPolicy.DESTROY)

        const qmmRedisNLB = new NetworkLoadBalancer(this, 'qmmRedisNLB', {
            loadBalancerName: 'qmmRedisNLB',
            vpc: this.vpc,
            vpcSubnets: {
                subnets: this.vpc.publicSubnets
            },
            crossZoneEnabled: true,
            securityGroups: [nlbSG]
        })
        qmmRedisNLB.applyRemovalPolicy(RemovalPolicy.DESTROY)

        const qmmRedisTargetGroup = new NetworkTargetGroup(this, 'qmmRedisTargetGroup2', {
            vpc: this.vpc,
            port: 6379,
            targets: [service],
            protocol: Protocol.TCP,            
        })
        const qmmRedisListener = qmmRedisNLB.addListener('qmmRedisListener', {
            port: 6379,
            defaultTargetGroups: [qmmRedisTargetGroup]
        })
        qmmRedisNLB.applyRemovalPolicy(RemovalPolicy.DESTROY)
        qmmRedisListener.applyRemovalPolicy(RemovalPolicy.DESTROY)
    }
    private createRedisService(taskDefinition: FargateTaskDefinition, sg: SecurityGroup) {

        const redisService = new FargateService(this, "redisService", {
            cluster: this.fargateCluster,
            vpcSubnets: {
                subnets: this.vpc.privateSubnets
            },
            taskDefinition,
            serviceName: 'redis-service',
            securityGroups: [sg],
            desiredCount: 3,
        })
        return redisService
    }

    private createRedisServiceWithHealthCheck(taskDefinition: FargateTaskDefinition, sg: SecurityGroup) {
        const redisService = new FargateService(this, "redisService-HealthCheck", {
            cluster: this.fargateCluster,
            vpcSubnets: {
                subnets: this.vpc.privateSubnets
            },
            taskDefinition,
            serviceName: 'redis-service-healthcheck',
            securityGroups: [sg],
            desiredCount: 3,
        })
        redisService.applyRemovalPolicy(RemovalPolicy.DESTROY)
        return redisService
    }

    private getRoles() {
        // If you want to talk to Dynamodb, taskRole 
        const taskRole = new Role(this, 'RedisTask-TaskRole', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
        })

        taskRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this, "taskRole-PowerUser",
            "arn:aws:iam::aws:policy/PowerUserAccess"
        ),)
        taskRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AmazonECSTaskExecutionRolePolicy'
        ),)
        taskRole.applyRemovalPolicy(RemovalPolicy.DESTROY)
        // For ECS agent to pick up image from ECR, we need TaskExection Role.
        const taskExecutionRole = new Role(this, 'RedisTask-IamRole', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),

        })
        taskExecutionRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AmazonECSTaskExecutionRolePolicy'
        ),)
        taskExecutionRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this, "PowerUser",
            "arn:aws:iam::aws:policy/PowerUserAccess"
        ),)
        taskExecutionRole.applyRemovalPolicy(RemovalPolicy.DESTROY)
        return { taskRole, taskExecutionRole }
    }

    private getRedisTaskDefinition(taskRole: Role, taskExecutionRole: Role) {
        const redisImage = ContainerImage.fromAsset(join(process.cwd(), './docker-images/redis'), {
        });

        const redisTaskDefinition = new FargateTaskDefinition(this, 'Redis-TaskDefination', {
            taskRole,
            executionRole: taskExecutionRole,
        });

        redisTaskDefinition.addContainer('basic-image', {
            image: redisImage,
            portMappings: [{
                containerPort: 6379,
            }],
        });
        redisTaskDefinition.applyRemovalPolicy(RemovalPolicy.DESTROY)
        return redisTaskDefinition
    }

    private getRedisTaskDefinitionWithHealthCheck(taskRole: Role, taskExecutionRole: Role) {
        const redisImage = ContainerImage.fromAsset(join(process.cwd(), './docker-images/redisHealthCheck'), {
        });

        const redisTaskDefinition = new FargateTaskDefinition(this, 'Redis-TaskDefination-HealthCheck', {
            taskRole,
            executionRole: taskExecutionRole,

        });

        redisTaskDefinition.addContainer('redis-basic-image', {
            image: redisImage,
            portMappings: [{
                containerPort: 6379,
            }],
        });
        redisTaskDefinition.applyRemovalPolicy(RemovalPolicy.DESTROY)
        return redisTaskDefinition
    }

    private createVPCAndFargateCluster() {
        this.vpc = new Vpc(this, 'Vpc', {
            maxAzs: 2,
            enableDnsHostnames: true,
            enableDnsSupport: true,
        })
        this.vpc.applyRemovalPolicy(RemovalPolicy.DESTROY)

        this.fargateCluster = new Cluster(this, 'Infra-FargateCluster', {
            vpc: this.vpc
        })
        this.fargateCluster.applyRemovalPolicy(RemovalPolicy.DESTROY);

        // const bucket = Bucket.fromBucketArn(this,"importBucket","arn:aws:s3:::fuse-logggin-ass-339713054130-ap-south-1")

        // new FlowLog(this, "flowLogs",{
        //     flowLogName: "vpctestflowlogs",
        //     resourceType: FlowLogResourceType.fromVpc(this.vpc),
        //     destination: FlowLogDestination.toS3(bucket, "/vpcFlowLogs")
        // })

        const logConfig2 = new CfnResolverQueryLoggingConfig(this,"logCOnfig2",{
            destinationArn: "arn:aws:s3:::fuse-logggin-ass-339713054130-ap-south-1",
            name: "test-assoicate2",
            
        })

        const associate2 = new CfnResolverQueryLoggingConfigAssociation(this,"assoicate2",{
            resourceId: this.vpc.vpcId,
            resolverQueryLogConfigId: logConfig2.attrId,
            
        })

        // associate2.
        
    }


}
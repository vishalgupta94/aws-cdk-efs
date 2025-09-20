import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import {  Peer, Port, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancer, ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { join } from "path";


export class BasicFargate extends Stack {
    private vpc: Vpc;
    private fargateCluster: Cluster;
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.createVPCAndFargateCluster()

        const { taskRole, taskExecutionRole } = this.getRoles()

        const registry = new Repository(this,"ECR-Repository", {
            repositoryName: "basic-fargate-registry"
        })
        const taskDefinition = this.getTaskDefinition(taskRole, taskExecutionRole, registry)



        const securityGroup = new SecurityGroup(this, "SecurityGroup", {
            vpc: this.vpc,
            securityGroupName: "Service-SG",
        })

        securityGroup.addIngressRule(Peer.anyIpv4(), Port.allTraffic())
        securityGroup.applyRemovalPolicy(RemovalPolicy.DESTROY)

        const fargateService = this.createServiceWithHealthCheck(taskDefinition, securityGroup)
        this.createLoadBalancer(fargateService)

    }
    
    private createLoadBalancer(sg: FargateService){

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
            targetGroupName: "express-base-tg",
        }) 

        new CfnOutput(this, "ALB-DNS", {
            value: alb.loadBalancerDnsName
        })
    }

    private createServiceWithHealthCheck(taskDefinition: FargateTaskDefinition, sg: SecurityGroup) {
        const redisService = new FargateService(this, "FargateService", {
            cluster: this.fargateCluster,
            vpcSubnets: {
                subnets: this.vpc.privateSubnets
            },
            taskDefinition,
            serviceName: 'basic-fargate-service',
            securityGroups: [sg],
            desiredCount: 3,
        })
        redisService.applyRemovalPolicy(RemovalPolicy.DESTROY)
        return redisService
    }

    private getRoles() {
        // If you want to talk to Dynamodb, taskRole 
        const taskRole = new Role(this, 'BasicFaragte-TaskRole', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
        })

        // taskRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this, "taskRole-PowerUser",
        //     "arn:aws:iam::aws:policy/PowerUserAccess"
        // ),)
        taskRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AmazonECSTaskExecutionRolePolicy'
        ),)
        taskRole.applyRemovalPolicy(RemovalPolicy.DESTROY)
        // For ECS agent to pick up image from ECR, we need TaskExection Role.
        const taskExecutionRole = new Role(this, 'BasicFaragte-ExecutionRole', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),

        })
        taskExecutionRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AmazonECSTaskExecutionRolePolicy'
        ),)
        // taskExecutionRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this, "PowerUser",
        //     "arn:aws:iam::aws:policy/PowerUserAccess"
        // ),)
        taskExecutionRole.applyRemovalPolicy(RemovalPolicy.DESTROY)
        return { taskRole, taskExecutionRole }
    }

    private getTaskDefinition(taskRole: Role, taskExecutionRole: Role,registry: Repository) {
        const image = ContainerImage.fromAsset(join(process.cwd(), './docker-images/basic-express'), {

        });

        const image2 = ContainerImage.fromEcrRepository(registry)

        const taskDefinition = new FargateTaskDefinition(this, 'taskDefination', {
            taskRole,
            executionRole: taskExecutionRole,
        });

        taskDefinition.addContainer('basic-image', {
            image: image2,
            portMappings: [{
                containerPort: 3000,
            }],
        });
        taskDefinition.applyRemovalPolicy(RemovalPolicy.DESTROY)
        return taskDefinition
    }

    private createVPCAndFargateCluster() {
        this.vpc = new Vpc(this, 'Vpc', {
            maxAzs: 2,
            enableDnsHostnames: true,
            enableDnsSupport: true,
        })
        this.vpc.applyRemovalPolicy(RemovalPolicy.DESTROY)

        this.fargateCluster = new Cluster(this, 'Infra-BasicFargateCluster', {
            vpc: this.vpc
        })
        this.fargateCluster.applyRemovalPolicy(RemovalPolicy.DESTROY);

    
    }


}
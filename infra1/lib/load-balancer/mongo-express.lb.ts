import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib"
import { Construct } from "constructs";
import { Peer, Port, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, LogDriver, } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancer, ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";

export const mongoExpressLb = (props: {
    scope: Construct,
    service: FargateService,
    vpc: Vpc,
}) => {
    const { service,scope,vpc } = props;

        const albSG = new SecurityGroup(scope, "MongoService-ALB", {
            vpc
        })

        albSG.addIngressRule(Peer.anyIpv4(), Port.allTraffic())
        albSG.applyRemovalPolicy(RemovalPolicy.DESTROY)

        const alb = new ApplicationLoadBalancer(scope,"alb-mongo-service",{
            vpc,
            internetFacing: true,
            crossZoneEnabled: true,
            securityGroup: albSG,
            vpcSubnets: {
                subnets: vpc.publicSubnets
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
            targets: [service],
            stickinessCookieName: "session_id",
            stickinessCookieDuration: Duration.days(1),
            targetGroupName: "express-tg", 
        }) 
        new CfnOutput(scope, "MongoExpress-DNS", {
            value: alb.loadBalancerDnsName,
            exportName: 'MongoExpress-DNS'
        })
        
}
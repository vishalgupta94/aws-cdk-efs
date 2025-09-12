import { RemovalPolicy } from "aws-cdk-lib"
import { Construct } from "constructs";
import { Peer, Port, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, LogDriver, } from "aws-cdk-lib/aws-ecs";

export const mongoService = (props: {
    scope: Construct,
    cluster: Cluster,
    taskDefinition: FargateTaskDefinition,
    vpc: Vpc
}) => {
    const {
        scope,
        cluster,
        vpc,
        taskDefinition
    } = props;

    const mongodbSG = new SecurityGroup(scope, "MongoServiceSG", {
        vpc,
        securityGroupName: "MongoServiceSG",
    })

    mongodbSG.addIngressRule(Peer.anyIpv4(), Port.allTraffic())
    mongodbSG.applyRemovalPolicy(RemovalPolicy.DESTROY)

    const fargateService = new FargateService(scope, "mongo-express-service", {
        cluster,
        vpcSubnets: {
            subnets: vpc.privateSubnets
        },
        taskDefinition,
        serviceName: 'mongo-express-service',
        securityGroups: [mongodbSG],
        desiredCount: 1,
        
    })

    fargateService.applyRemovalPolicy(RemovalPolicy.DESTROY)
    fargateService.node.addDependency(mongodbSG)
    return fargateService
}
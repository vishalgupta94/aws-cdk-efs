import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { AttributeType, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { createClusterAndVpc } from "../helpers/vpc-cluster";
import { getRoles } from "../helpers";
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, LogDriver, Protocol } from "aws-cdk-lib/aws-ecs";
import { join } from "path";
import { Role } from "aws-cdk-lib/aws-iam";
import { InterfaceVpcEndpoint, InterfaceVpcEndpointAwsService, InterfaceVpcEndpointService, Peer, Port, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";

export class AwsBasicVPCEndpoint extends Stack {

    private table: TableV2
    constructor(scope: Construct, id: string, props?: StackProps) {
       super(scope, id, props);
       const table = this.createDynamoDB()
       const { vpc, cluster } = createClusterAndVpc(this)
       const { taskRole, taskExecutionRole } = getRoles(this);
       table.grantFullAccess(taskRole)
       
       const vpcInterfaceEndpointService = this.createFargateService(taskExecutionRole, taskRole, cluster,vpc )
       this.createDynamoDBInterfaceEndpoint(vpc)    
      //  vpc.addInterfaceEndpoint("dynamodb",{

      //  })   
    } 

  private createDynamoDBInterfaceEndpoint(vpc: Vpc){
    const interfaceEndpoint = new InterfaceVpcEndpoint(this,"DynamoDBInterfaceEndpoint",{
      vpc,
      service: InterfaceVpcEndpointAwsService.DYNAMODB,
      subnets: { subnets: vpc.publicSubnets },
      privateDnsEnabled: false,
    })
  }  

  private createFargateService(executionRole: Role, taskRole: Role,cluster: Cluster,vpc: Vpc){

    const securityGroup = new SecurityGroup(this, "VpcEndpointSG", {
        vpc
    })

    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(5000))
    securityGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);
    const dockerImage = ContainerImage.fromAsset(join(process.cwd(), './services/basic-vpc-endpoint'), {
    });

    const xrayImage = ContainerImage.fromRegistry("amazon/aws-xray-daemon")

    const taskDefination = new FargateTaskDefinition(this, "FargateTaskDefinition",{
      executionRole,
      taskRole
    })

    const mainContainer = taskDefination.addContainer('basic-image', {
        image: dockerImage,
        portMappings: [{
            containerPort: 5000,
        }],
        environment: {
            PORT: "5000",
            AWS_REGION:"ap-south-1",
            TABLE_NAME:"VPCEndpointTable"
        },
        logging: LogDriver.awsLogs({
          streamPrefix: "vpc-endpoint"
      }),
    });

    const xRayContainer = taskDefination.addContainer('xray-image', {
      image: xrayImage,
      portMappings: [{
          containerPort: 2000,
          protocol: Protocol.UDP
      }],
      logging: LogDriver.awsLogs({
        streamPrefix: "xray"
     }),
  });

    taskDefination.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const service = new FargateService(this,"fargateService", {
      cluster,
      taskDefinition: taskDefination,
      assignPublicIp: true,
      desiredCount: 1,
      securityGroups: [securityGroup]
    })
    return service
  }

    private createDynamoDB(){
        const table = new TableV2(this,"DynamoDBTable",{
            tableName: "VPCEndpointTable",
            partitionKey: {
                name: "PK",
                type: AttributeType.STRING
            },
            // sortKey: {
            //     name: "SK",
            //     type: AttributeType.STRING
            // },
            removalPolicy: RemovalPolicy.DESTROY
        })
        return table
    }
}
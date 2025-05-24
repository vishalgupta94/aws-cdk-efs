import { RemovalPolicy } from "aws-cdk-lib"
import { Scope } from "aws-cdk-lib/aws-ecs"
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam"
import { Construct } from "constructs"

export const getRoles = (scope: Construct,) => {
    // If you want to talk to Dynamodb, taskRole 
    const taskRole = new Role(scope, 'RedisTask-TaskRole', {
        assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
    })

    // taskRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(scope, "taskRole-PowerUser",
    //     "arn:aws:iam::aws:policy/PowerUserAccess"
    // ),)
    taskRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AmazonECSTaskExecutionRolePolicy'
    ),)

    taskRole.applyRemovalPolicy(RemovalPolicy.DESTROY);
    // For ECS agent to pick up image from ECR, we need TaskExection Role.
    const taskExecutionRole = new Role(scope, 'RedisTask-IamRole', {
        assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),

    })
    taskExecutionRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AmazonECSTaskExecutionRolePolicy'
    ),)
    // taskExecutionRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(scope, "PowerUser",
    //     "arn:aws:iam::aws:policy/PowerUserAccess"
    // ),)
    taskExecutionRole.applyRemovalPolicy(RemovalPolicy.DESTROY)
    return { taskRole, taskExecutionRole }
}



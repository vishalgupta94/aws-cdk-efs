import { RemovalPolicy } from "aws-cdk-lib"
import { Vpc } from "aws-cdk-lib/aws-ec2"
import { Cluster } from "aws-cdk-lib/aws-ecs"
import { Construct } from "constructs"

export const createClusterAndVpc = (scope: Construct): { vpc: Vpc; cluster: Cluster } => {

    const vpc = new Vpc(scope, "Vpc", {
        maxAzs: 1
    });

    vpc.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const cluster = new Cluster(scope, "Cluster", {
        vpc
    });
    cluster.applyRemovalPolicy(RemovalPolicy.DESTROY);

    return { vpc, cluster };
};
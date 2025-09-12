import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import {
  NodejsFunction,
  NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  CustomResource,
  Duration,
  RemovalPolicy,
  Stack,
} from 'aws-cdk-lib/core';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import path from 'path';


export class AddTagsToEventBridgeRule extends Construct {
  private certificateHandler: NodejsFunction;
  private functionName: string;

  constructor(
    scope: Construct,
    private props: {
        ruleName: string
    }
  ) {

    super(scope, props.ruleName);

  }

  public addTagestoRule = (): void => {
    this.certificateHandler = this.createHandler();

    this.addPolicyToLambda();

    const provider = this.createResourceProvider();

    const customResource = this.createCustomResource(provider);
  };

  private createHandler = (): NodejsFunction => {
    const entry = path.resolve(
      __dirname,
      './index.ts'
    );
    const certificateHandlerProps: NodejsFunctionProps = {
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.seconds(150),
      handler: "handler",
      memorySize: 2056,
      entry,
      functionName: `rule-custom-resource-${this.props.ruleName}`,
    };
    return new NodejsFunction(
      this,
      'CertificateHandler',
      certificateHandlerProps
    );
  };



  private addPolicyToLambda = (): void => {
    this.certificateHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "events:PutRule",
          "events:TagResource"
        ],
        resources: ['*'],
      })
    );
  };

  private createResourceProvider = (): Provider => {
    return new Provider(this, 'Provider', {
      onEventHandler: this.certificateHandler,
    });
  };

  private createCustomResource = (
    provider: Provider,
  ): CustomResource => {
    const customResourceProps = {
      serviceToken: provider.serviceToken,
      properties: {
        ruleName: this.props.ruleName,
      },
    };
    return new CustomResource(this, 'CustomResource', customResourceProps);
  };
}

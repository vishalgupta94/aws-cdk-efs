import { Stack, StackProps } from "aws-cdk-lib";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { Construct } from "constructs";
import { AddTagsToEventBridgeRule } from "./custom-rule";




export class RulesTags extends Stack {


    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const defaulutBus = EventBus.fromEventBusName(this,"default", "default")

        const rule = new Rule(this,"rule", {
            eventBus: defaulutBus,
            eventPattern: {
                detail: {
                    key: ["Value"]
                }
            },
            ruleName: "vishal-test"
        })

        new AddTagsToEventBridgeRule(this, {
            ruleName: "vishal-test"
        }).addTagestoRule()

        const rule2 = new Rule(this,"rule2", {
            eventBus: defaulutBus,
            eventPattern: {
                detail: {
                    key2: ["Value"]
                }
            },
            ruleName: "vishal-test2"
        })

        new AddTagsToEventBridgeRule(this, {
            ruleName: "vishal-test2"
        }).addTagestoRule()

    }

}
import { EventBridgeClient, TagResourceCommand } from '@aws-sdk/client-eventbridge';
import { CdkCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';

export const handler = async (
  event: CdkCustomResourceEvent
): Promise<CdkCustomResourceResponse> => {
  console.log('event', JSON.stringify(event));
  const { RequestType } = event;
  try {
    const { ruleName } = event.ResourceProperties as unknown as  {
        ruleName: string
    }
    if (RequestType === 'Create' || RequestType === 'Update') {

           const client = new EventBridgeClient({
              region:"ap-south-1",
              // profile:"profile339713054130"
           })
           const arn = `arn:aws:events:ap-south-1:339713054130:rule/${ruleName}`;

           const command = new TagResourceCommand({
             ResourceARN:arn,
             Tags: [ {
                 Key: "key",
                 Value: `valiuer-${Date.now()}`
             }],
        
           })
        
           const response = await client.send(command)
           console.log("response",response)

           return {
            PhysicalResourceId: arn
          };

    } else {
      const physicalResourceId = event.PhysicalResourceId;
      return {
        PhysicalResourceId: physicalResourceId,
      };
    }
  } catch (error) {
    console.log("error", JSON.stringify(error));
    throw error;
  }
};


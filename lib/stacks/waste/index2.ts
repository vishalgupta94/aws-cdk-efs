import {
    EventBridgeClient,
    TagResourceCommand,
  } from '@aws-sdk/client-eventbridge';

(async ()=>{
   const client = new EventBridgeClient({
      region:"ap-south-1",
      // profile:"profile339713054130"
   })

   const command = new TagResourceCommand({
     ResourceARN:"arn:aws:events:ap-south-1:339713054130:rule/vishal-test",
     Tags: [ {
         Key: "key",
         Value: "valiuer"
     }],

   })

   const response = await client.send(command)
   console.log("response",response)
})()
import { SQSClient, SendMessageCommand, SendMessageCommandInput } from "@aws-sdk/client-sqs"
import axios from "axios";
export const handler = async (event: any) => {


    let endpoint: string;    
    try{
        const response = await axios.get("https://www.google.com", {
            timeout: 5000,
          });

          const response2 = await axios.get("http://vishal-service.boobar.com:3000", {
            timeout: 5000,
          });          

        return {
            statusCode: 200,
            body: JSON.stringify({response,response2}),
        };
    }catch(e){

    // TODO implement
    return {
        statusCode: 200,
        body: JSON.stringify(e),
      };

    }
  };
  
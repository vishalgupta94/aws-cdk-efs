import express, { NextFunction, Request, Response } from "express"
import dotenv from "dotenv"
import { DynamoDBClient, DynamoDB, GetItemCommand, PutItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb"
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import AWSXRay from "aws-xray-sdk"
const app = express()

app.use(AWSXRay.express.openSegment("MyApp"))


dotenv.config()

const client = AWSXRay.captureAWSv3Client(new DynamoDBClient({ region: process.env.AWS_REGION }));
 

app.use(express.json())
app.get("/",(req,res)=>{
    res.json(process.env)
})

app.get("/getValue", async (req: Request, res: Response): Promise<any> => {
    console.log("request", req.query);
    const key = req.query['key'] as string; 

    if (!key){
        return res.json({
            body: "Please provide key params"
        }).status(422)
    }
    try{
        const command = new GetItemCommand({
            TableName: process.env.TABLE_NAME,
            Key: {
              PK: {
                S: key
              }
            },
          });
        const response = await client.send(command)

        if (response.$metadata.httpStatusCode == 200 && response.Item) {
         return res.json(unmarshall(response.Item)).status(response.$metadata.httpStatusCode)
        }else{
          return res.status(response.$metadata.httpStatusCode ?? 400).json({
            response
          })
        }
    }catch(e){
        return res.status(500).send((e as Error).message)
    }
})

app.delete("/removeValue", async (req: Request, res: Response): Promise<any> => {
  console.log("request", req.query);
  const key = req.query['key'] as string;

  if (!key){
      return res.json({
          body: "Please provide key params"
      }).status(422)
  }
  try{
      const command = new DeleteItemCommand({
          TableName: process.env.TABLE_NAME,
          Key: {
            PK: {
              S: key
            }
          },
        });
      const response = await client.send(command)

      if (response.$metadata.httpStatusCode == 200) {
       return res.json({
        body: "successfuly removed"
       }).status(response.$metadata.httpStatusCode)
      }else{
        return res.status(response.$metadata.httpStatusCode ?? 400)
      }
  }catch(e){
      return res.status(500).send((e as Error).message)
  }
})

app.post("/setKey",async (req: Request, res: Response): Promise<any> => {
    const requestBody = req.body;
    const key = requestBody?.key
    const value = requestBody?.value

    if (!key || !value){
        return res.json({
            body: "Please provide key and value in request body"
        }).status(422)
    }

    try{
        const command = new PutItemCommand({
            TableName: process.env.TABLE_NAME,
            Item: {
                PK: {
                    S: key
                  },
                  SK: {
                    S: value
                  },
            }
          });
        console.log("command",command)  
        const response = await client.send(command)
        console.log("response",response)  

        if (response.$metadata.httpStatusCode == 200 ) {
         return res.status(204).json({
            body: "Key-value pair set successfully"
         })
        }else{
          return res.status(response.$metadata.httpStatusCode ?? 400).json({
            body: "Failed to set key-value pair"
          })
        }
    }catch(e){
        return res.status(500).send((e as Error).message)
    }
})

app.use(AWSXRay.express.closeSegment());

app.listen(process.env.PORT,()=>{
    console.log("Basic VPC Endpoint sertvice connected")
})
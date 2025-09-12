import express from "express";
import {Request,Response} from "express";
import { SQSClient, SendMessageCommand, SendMessageCommandInput } from "@aws-sdk/client-sqs"
const app = express()

app.get("/",(req:Request ,res:Response)=>{
    console.log("healthcheck")
    res.status(200).send("hello world")
})

app.get("/cookie",(req:Request ,res:Response)=>{    
    console.log("cookie",req.headers.cookie)
    res.cookie('session_id', '123456', {
        httpOnly: false,  // Prevents client-side JavaScript from accessing the cookie
        secure: false,    // Ensures the cookie is only sent over HTTPS
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000 // 1 day expiration
    });
    res.status(200).json({
        body: req.headers.cookie
    })
})

app.get("/abcd",(req:Request ,res:Response)=>{
    res.status(202).json({
        body: "abcd response"
    })
})

app.get("/login",(req:Request ,res:Response)=>{
    console.log("login req",req.body)
    res.status(202).json({
        body:JSON.stringify(req.body)
    })
})


app.get("/sendSQS",async (req:Request ,res:Response)=>{
    let endpoint: string;    
    try{
        endpoint = 'https://vpce-0d9b6707ea36977d8-h7opo48a.sqs.ap-south-1.vpce.amazonaws.com'
        const input: SendMessageCommandInput = {
            MessageBody: "message body to check SQS INtegrace endint",
            QueueUrl: process.env.SQS_URL,
            
        }
        const command = new SendMessageCommand(input);
        console.log
        const client = new SQSClient({
            region: process.env.AWS_REGION,
            endpoint,            
        })
        const response = await client.send(command)
        
        res.status(202).json({
            body: response
        });
    }catch(e){
        endpoint = 'https://vpce-0d9b6707ea36977d8-h7opo48a.sqs.ap-south-1.vpce.amazonaws.com'
        res.status(502).json({
            body: JSON.stringify({e,endpoint}),
        });
    }

});
app.get("/abcd2",(req:Request ,res:Response)=>{
    res.status(202).json({
        body: "abcd response"
    })
})

app.listen(3000,()=>{
    console.log('Basic Fargate is Running on Port 3000')
})
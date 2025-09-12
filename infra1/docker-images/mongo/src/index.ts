import express from "express";
import {Request,Response} from "express";
import { SQSClient, SendMessageCommand, SendMessageCommandInput } from "@aws-sdk/client-sqs"
const app = express()
import  { MongoClient } from "mongodb";

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

app.get("/data",async (req:Request ,res:Response)=>{
    const uri = "mongodb://root:example@localhost:27017/?authSource=admin";  // Update if needed

    try {
        const client = new MongoClient(uri);

        await client.connect();
        console.log("Connected to MongoDB container successfully!");

        // Access the database
        const db = client.db("testdb");  // Change "testdb" to your database name
        const collection = db.collection("users");  // Example collection

        const users = await collection.find().toArray();
        console.log("Users:", users);

        // Close the connection
        await client.close();
        res.status(202).json({
            body: JSON.stringify(users)
        })
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        res.status(400).json({
            error
        })
    }
})

app.get("/addData",async (req:Request ,res:Response)=>{
    const uri = "mongodb://root:example@localhost:27017/?authSource=admin";  // Update if needed

    try {
        const client = new MongoClient(uri);

        await client.connect();
        console.log("Connected to MongoDB container successfully!");

        // Access the database
        const db = client.db("testdb");  // Change "testdb" to your database name
        const collection = db.collection("users");  // Example collection

        const users = await collection.find().toArray();
        console.log("Users:", users);
        await collection.insertOne({ name: "John Doe One", age: 31 });
        await collection.insertOne({ name: "John Doe Two", age: 32 });
        await collection.insertOne({ name: "John Doe Thress", age: 33 });
        // Close the connection
        await client.close();
        res.status(202).json({
            body: JSON.stringify(users)
        })
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        res.status(400).json({
            error
        })
    }
})

app.listen(3000,()=>{
    console.log('Basic Fargate is Running on Port 3000')
})
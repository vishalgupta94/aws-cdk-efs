import express, {Request,Response} from "express"
import {User} from "./user"
import {router as userRouter} from './user-router'
import { connectMongo } from "./mongo";
import {connect} from "mongoose"
const app = express()

app.use(express.json())

connect("mongodb://mongo:27017/myappdb")
.then((value) => console.log("MongoDB connected"))
.catch((err) => {
console.error("Connection error:", err.message);
process.exit(1);
});
app.use(userRouter)

app.get("/test",(req: Request,res:Response)=>{
    res.json({
        key:"value"
    })
})

app.get("/",async (req: Request,res:Response)=>{
    res.json({
        key:"value"
    })
})

app.listen(3005,()=>{
    console.log("server connected")
})
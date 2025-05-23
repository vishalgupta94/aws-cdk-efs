import express, {Request,Response} from "express"

import {Express} from "express"

const app = express()

app.get("/test",(req: Request,res:Response)=>{
    res.json({
        key:"value"
    })
})

app.listen(3000,()=>{
    console.log("sevre connected")
})
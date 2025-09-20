import { Router } from "express";
import { User } from "./user";


export const router = Router();

router.get("/user",async (req,res)=>{
    const data = await User.find();
    console.log("data",data)
    res.json(data)
})

router.post("/user",async (req,res)=>{
    const body = req.body;

    const user = new User({
        name: body?.name || Date.now()
    })
    const data = await user.save()
    console.log("data",data)
    res.json(data)
})

/*

{
    "name":"vishal"
}

*/
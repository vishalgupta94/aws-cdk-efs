import {connect} from "mongoose"

export const connectMongo = async () => {
    try{
        const response = await connect("mongodb://localhost:27017/vishaldb")
        console.log("response",response)
    }catch(e){
        console.error((e as  Error).message)
    }

}
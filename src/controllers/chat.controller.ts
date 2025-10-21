import { Request, Response } from "express";
import Joi from "joi";

export default class ChatCtrl {

    static async createChat(req: Request, res: Response){

        const {} = req.body;

        const schema = Joi.object({

        })

        const { error } = schema.validate({})
        if(error){
            return res.status(400).json({message: error.message});
        }
    

        try {
            return res.json({message: "Chat created successfully"});            
        } catch (error) {
                return res.status(500).json({message: error});
        }
    }

    static async getChats(req: Request, res: Response){

        const schema = Joi.object({

        })

        const { error } = schema.validate({})
        if(error){
            return res.status(400).json({message: error.message});
        }

         try {
            return res.json({message: "Get chats successfully fetched!!"});            
        } catch (error) {
                return res.status(500).json({message: error});
        }
    }

}
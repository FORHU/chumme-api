import { Request, Response } from "express";
import Joi from "joi";
import ChatSvc from "../services/chat.service";
import ChatRepo from "../repositories/chat.repository";

export default class ChatCtrl {

    static async sendChat(req: Request, res: Response){

        const {input, userId} = req.body;

        const schema = Joi.object({
            input: Joi.string().required(),
            userId: Joi.string().required()
        })

        const { error } = schema.validate(req.body)
        
        if(error){
            return res.status(400).json({message: error.message});
        }

         try {
            const result = await ChatSvc.sendChat(input, userId); 
            return res.json(result);  
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
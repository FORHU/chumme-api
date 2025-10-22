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

    static async getChatByChatId(req: Request, res: Response){

        const { chatId } = req.params;

        const schema = Joi.object({
            chatId: Joi.string().required()
        })

        const { error } = schema.validate({chatId})
        if(error){
            return res.status(400).json({message: error.message});
        }

         try {
             const chatMessage = await ChatSvc.getChatMessageById(chatId);
             return res.json(chatMessage);       
        } catch (error) {
                return res.status(500).json({message: error});
        }
    }

}
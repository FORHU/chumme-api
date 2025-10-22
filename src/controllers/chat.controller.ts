import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import ChatSvc from "../services/chat.service";
import { ChatRole } from "@prisma/client";
import { BadRequestError } from "../utils/error.util";

export default class ChatCtrl {

    static async sendChat(req: Request, res: Response, next: NextFunction){

        const {input } = req.body;
        const { id: userId } = req.user;

        const schema = Joi.object({
            input: Joi.string().required(),
            userId: Joi.string().required()
        })

        const { error } = schema.validate({ input, userId })
        
        if(error){
            next(new BadRequestError(error.message));
        }

         try {
            const result = await ChatSvc.sendChat(input, userId); 
            return res.json(result);  
        } catch (error) {
               next(error);
        }

    }

    static async getChatByChatId(req: Request, res: Response, next: NextFunction){

        const { chatId } = req.params;
        const { role } = req.query;
        const { id: currentUserId } = req.user;

        const schema = Joi.object({
            chatId: Joi.string().required(),
            role: Joi.string().valid(...Object.values(ChatRole)).optional()
        })

        const { error } = schema.validate({chatId, role})
        if(error){
            next(new BadRequestError(error.message));
        }


         try {
             const chatMessage = await ChatSvc.getChatMessageById(chatId, currentUserId);
             return res.json(chatMessage);       
        } catch (error) {
            next(error);
        }
    }

}
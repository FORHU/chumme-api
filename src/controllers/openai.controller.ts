import { Request, Response } from "express";
import Joi from "joi";
import OpenAISvc from "../services/openai.service";
import { formatAIResponse } from "../utils/openai/ai-response.util";

export default class OpenAICtrl {
    static async getAIResponse(req: Request, res: Response){

        const { text } = req.body;

        const schema = Joi.object({
            text: Joi.string().required()
        })

        const { error } = schema.validate(req.body)
        if(error){
            return res.status(400).json({message: error.message});
        }
    

        try {
            const { message, emotion } = await OpenAISvc.getAIResponse(text); 
            const result = formatAIResponse(message, emotion);
            return res.json(result);
            
        } catch (error) {
                return res.status(500).json({message: error});
        }
    }

}
import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { BadRequestError, InternalServerError } from "../utils/error.util";

import logger from "../utils/logger";
import ChatWonderSvc from "../services/chat-wonder.service";

export default class ChatWonderCtrl {
  static async sendChat(req: Request, res: Response, next: NextFunction) {
    const { input, conversationId } = req.body;
    const { id: userId } = req.user;

    if (!userId) {
      return next(
        new InternalServerError("Authenticated user not found in request")
      );
    }

    const schema = Joi.object({
      input: Joi.string().min(1).max(500).optional(),
      conversationId: Joi.optional(),
    });

    const { error } = schema.validate(req.body);

    if (error) {
      next(new BadRequestError(error.message));
    }

    try {
      const result = await ChatWonderSvc.sendChat(input, userId, conversationId);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

}

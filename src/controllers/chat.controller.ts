import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import ChatSvc from "../services/chat.service";
import { ChatRole } from "@prisma/client";
import { BadRequestError, InternalServerError } from "../utils/error.util";
import { sendChatWithParsedMedia } from "../utils/chat-wonder-api";

import logger from "../utils/logger";

export default class ChatCtrl {
    static async sendChat(req: Request, res: Response, next: NextFunction) {
        const { input, conversationId } = req.body;
        const { id: userId, chatSessionId } = req.user;

        if (!userId) {
            return next(
                new InternalServerError(
                    "Authenticated user not found in request"
                )
            );
        }

        if (!chatSessionId) {
            return next(
                new InternalServerError(
                    "Authenticated chat session ID not found in request"
                )
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
            const result = await ChatSvc.sendChat(
                input,
                userId,
                conversationId,
                chatSessionId
            );
            return res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async getChatByChatId(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        const { chatId } = req.params;
        const { role } = req.query;
        const { id: currentUserId } = req.user;

        if (!currentUserId) {
            return next(
                new InternalServerError(
                    "Authenticated user not found in request"
                )
            );
        }

        const schema = Joi.object({
            chatId: Joi.string().required(),
            role: Joi.string()
                .valid(...Object.values(ChatRole))
                .optional(),
        });

        const { error } = schema.validate({ chatId, role });
        if (error) {
            next(new BadRequestError(error.message));
        }

        try {
            logger.info("[CHAT.SERVICES] - Fetching chat by id");
            const chatMessage = await ChatSvc.getChatMessageById(
                chatId,
                currentUserId
            );
            return res.json(chatMessage);
        } catch (error) {
            next(error);
        }
    }

    static async getChatListByUserId(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        const { id: currentUserId } = req.user;

        if (!currentUserId) {
            return next(
                new InternalServerError(
                    "Authenticated user not found in request"
                )
            );
        }

        const schema = Joi.object({
            page: Joi.number().integer().min(1).optional(),
            limit: Joi.number().integer().min(1).optional(),
            role: Joi.string()
                .valid(...Object.values(ChatRole))
                .optional(),
            sortOrder: Joi.string().valid("asc", "desc").optional(),
        });

        const { error, value } = schema.validate(req.query);
        if (error) {
            next(new BadRequestError(error.message));
        }

        const parsedPage = value.page || undefined;
        const parsedLimit = value.limit || undefined;
        const parsedRole = (value.role as ChatRole | undefined) || undefined;
        const sortOrder = value.sortOrder;

        try {
            const chatMessage = await ChatSvc.getChatListByUserId(
                currentUserId,
                {
                    page: parsedPage,
                    limit: parsedLimit,
                    role: parsedRole,
                    sortOrder,
                }
            );
            return res.json(chatMessage);
        } catch (error) {
            next(error);
        }
    }
    static async getAiChatHeader(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 0;
            const limit = parseInt(req.query.limit as string) || 20;
            const search_conversation = req.query.search_conversation as string;
            const search_message = req.query.search_message as string;

            const aiHeaders = await ChatSvc.getAiChatHeader(
                req?.user?.id,
                page,
                limit,
                search_conversation,
                search_message
            );
            res.json({
                success: true,
                data: aiHeaders,
                pagination: {
                    page,
                    limit,
                    hasMore: aiHeaders?.length === limit,
                },
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Send chat to chat-wonder AI and get structured response
     * POST /api/chat/wonder
     * Body: { input: string }
     * Returns: { response, videos, images, sessionId }
     */
    static async sendWonderChat(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        const { input } = req.body;
        const { id: userId, chatSessionId } = req.user;

        if (!userId) {
            return next(
                new InternalServerError(
                    "Authenticated user not found in request"
                )
            );
        }

        if (!chatSessionId) {
            return next(
                new InternalServerError(
                    "Authenticated chat session ID not found in request"
                )
            );
        }

        const schema = Joi.object({
            input: Joi.string().min(1).max(1000).required(),
        });

        const { error } = schema.validate(req.body);

        if (error) {
            return next(new BadRequestError(error.message));
        }

        try {
            logger.info(
                `[CHAT.CONTROLLER] sendWonderChat - userId: ${userId}, input: ${input.substring(0, 50)}...`
            );

            const result = await sendChatWithParsedMedia(input, chatSessionId);

            return res.json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            logger.error(
                `[CHAT.CONTROLLER] sendWonderChat error: ${error.message}`
            );
            next(error);
        }
    }
}

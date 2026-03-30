import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import ConversationSvc from "../services/conversation.service";
import { BadRequestError, InternalServerError } from "../utils/error.util";
import logger from "../utils/logger";

export default class ConversationCtrl {
  /**
   * Create a new conversation
   * POST /api/v1/conversations
   */
  static async createConversation(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const { title } = req.body;
    const { id: userId } = req.user;

    if (!userId) {
      return next(
        new InternalServerError("Authenticated user not found in request"),
      );
    }

    const schema = Joi.object({
      title: Joi.string().max(100).optional().allow(null, ""),
    });

    const { error } = schema.validate({ title });
    if (error) {
      return next(new BadRequestError(error.message));
    }

    try {
      logger.info("[CONVERSATION.CONTROLLER] - Creating new conversation");
      const conversation = await ConversationSvc.createConversation(
        userId,
        title,
      );
      return res.status(201).json(conversation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all conversations for the authenticated user
   * GET /api/v1/conversations
   */
  static async getConversations(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const { id: userId } = req.user;

    if (!userId) {
      return next(
        new InternalServerError("Authenticated user not found in request"),
      );
    }

    const schema = Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      sortOrder: Joi.string().valid("asc", "desc").optional(),
      includeDeleted: Joi.boolean().optional(),
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return next(new BadRequestError(error.message));
    }

    try {
      logger.info("[CONVERSATION.CONTROLLER] - Fetching conversations list");
      const conversations = await ConversationSvc.getConversationsList(userId, {
        page: value.page,
        limit: value.limit,
        sortOrder: value.sortOrder,
        includeDeleted: value.includeDeleted,
      });
      return res.json(conversations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single conversation by ID
   * GET /api/v1/conversations/:id
   */
  static async getConversationById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const { id: conversationId } = req.params;
    const { id: userId } = req.user;

    if (!userId) {
      return next(
        new InternalServerError("Authenticated user not found in request"),
      );
    }

    const schema = Joi.object({
      id: Joi.string().uuid().required(),
    });

    const { error } = schema.validate({ id: conversationId });
    if (error) {
      return next(new BadRequestError(error.message));
    }

    try {
      logger.info(
        `[CONVERSATION.CONTROLLER] - Fetching conversation ${conversationId}`,
      );
      const conversation = await ConversationSvc.getConversationById(
        conversationId,
        userId,
      );
      return res.json(conversation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update conversation title
   * PATCH /api/v1/conversations/:id/title
   */
  static async updateTitle(req: Request, res: Response, next: NextFunction) {
    const { id: conversationId } = req.params;
    const { title } = req.body;
    const { id: userId } = req.user;

    if (!userId) {
      return next(
        new InternalServerError("Authenticated user not found in request"),
      );
    }

    const schema = Joi.object({
      id: Joi.string().uuid().required(),
      title: Joi.string().min(1).max(100).required(),
    });

    const { error } = schema.validate({ id: conversationId, title });
    if (error) {
      return next(new BadRequestError(error.message));
    }

    try {
      logger.info(
        `[CONVERSATION.CONTROLLER] - Updating conversation ${conversationId} title`,
      );
      const updatedConversation = await ConversationSvc.updateConversationTitle(
        conversationId,
        userId,
        title,
      );
      return res.json(updatedConversation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete conversation (soft delete)
   * DELETE /api/v1/conversations/:id
   */
  static async deleteConversation(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const { id: conversationId } = req.params;
    const { id: userId } = req.user;

    if (!userId) {
      return next(
        new InternalServerError("Authenticated user not found in request"),
      );
    }

    const schema = Joi.object({
      id: Joi.string().uuid().required(),
    });

    const { error } = schema.validate({ id: conversationId });
    if (error) {
      return next(new BadRequestError(error.message));
    }

    try {
      logger.info(
        `[CONVERSATION.CONTROLLER] - Deleting conversation ${conversationId}`,
      );
      await ConversationSvc.deleteConversation(conversationId, userId);
      return res.json({
        message: "Conversation deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages in a conversation
   * GET /api/v1/conversations/:id/messages
   */
  static async getConversationMessages(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const { id: conversationId } = req.params;
    const { id: userId } = req.user;

    if (!userId) {
      return next(
        new InternalServerError("Authenticated user not found in request"),
      );
    }

    const schema = Joi.object({
      id: Joi.string().uuid().required(),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      role: Joi.string().valid("USER", "AI", "ADMIN").optional(),
      sortOrder: Joi.string().valid("asc", "desc").optional(),
    });

    const { error, value } = schema.validate({
      id: conversationId,
      ...req.query,
    });
    if (error) {
      return next(new BadRequestError(error.message));
    }

    try {
      logger.info(
        `[CONVERSATION.CONTROLLER] - Fetching messages for conversation ${conversationId}`,
      );

      // First verify conversation ownership
      await ConversationSvc.getConversationById(conversationId, userId);

      // Import ChatRepo dynamically to avoid circular dependency
      const ChatRepo = (await import("../repositories/chat.repository"))
        .default;

      const messages = await ChatRepo.getMessagesByConversationId(
        conversationId,
        userId,
        {
          page: value.page,
          limit: value.limit,
          role: value.role,
          sortOrder: value.sortOrder,
        },
      );
      return res.json(messages);
    } catch (error) {
      next(error);
    }
  }
}

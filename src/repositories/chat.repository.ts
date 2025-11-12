import { ChatRole, Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

export type TGetChatMessagesByUserIdOptions = {
    role?: ChatRole,
    page?: number,
    limit?: number,
    sortOrder?: "asc" | "desc",
    sortBy?: keyof Prisma.ChatMessageOrderByWithRelationInput
}

export default class ChatRepo {
    static async createChatMessage(data: Prisma.ChatMessageCreateInput) {

        return prisma.chatMessage.create({
            data,
            include: {
                emotionMemory: { select: { id: true, emotion: true, confidence: true } },
            }
        })
    }

    static async createEmotionMemory(data: Prisma.EmotionMemoryCreateInput) {
        return prisma.emotionMemory.create({
            data,
            // include: {
            //     ChatMessage: { select: { id: true, message: true }},
            // }
        })
    }

    static async getChatListByUserId(userId: string, options: TGetChatMessagesByUserIdOptions) {

        const {
            role,
            page = 1,
            limit = 5,
            sortOrder = "desc",
            sortBy = "createdAt"
        } = options;

        const skip = (page - 1) * limit

        const [messageList, total] = await Promise.all([
            prisma.chatMessage.findMany({
                where: { userId, ...(role && { role }) },
                include: { emotionMemory: { select: { id: true, emotion: true, confidence: true } }, },
                skip,
                orderBy: { [sortBy]: sortOrder },
                take: limit
            }),

            prisma.chatMessage.count({
                where: { userId, ...(role && { role }) },
            })
        ])

        return {
            data: messageList,
            currentPage: page,
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            page,
            limit
        }
    }


    static async getChatMessageById(chatMessageId: string, userId: string) {
        return prisma.chatMessage.findUnique({
            where: { id: chatMessageId, userId },
            include: {
                emotionMemory: { select: { id: true, emotion: true, confidence: true } },
                User: { select: { id: true, username: true, name: true } },
            }
        })
    }
}
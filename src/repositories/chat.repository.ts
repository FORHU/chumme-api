import { ChatRole, Prisma, PrismaClient  } from "@prisma/client";

const prisma = new PrismaClient();

console.log(Object.keys(prisma));

export default class ChatRepo{
    static async createChatMessage(data: Prisma.ChatMessageCreateInput){

        return prisma.chatMessage.create({
            data, 
            include: {
                emotionMemory: { select: { id: true, emotion: true, confidence: true }},
            }
        })
    }

    static async createEmotionMemory(data: Prisma.EmotionMemoryCreateInput){
        return prisma.emotionMemory.create({
            data,
            // include: {
            //     ChatMessage: { select: { id: true, message: true }},
            // }
        })
    }

    static async findChatMessagesByUserId(userId: string){
        return prisma.chatMessage.findMany({
            where: { userId },
            include: {
                emotionMemory:  { select: { id: true, emotion: true, confidence: true }},
            }
        })
    }

    static async getChatMessageById(chatMessageId: string, role?: ChatRole){
        return prisma.chatMessage.findUnique({
            where: { id: chatMessageId, ...(role && {role}) },
            include: {
                emotionMemory:  { select: { id: true, emotion: true, confidence: true }},
                User: { select: { id: true, username: true, name: true }},
            }
        })
    }
}
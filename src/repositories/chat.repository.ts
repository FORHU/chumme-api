import { Prisma, PrismaClient  } from "@prisma/client";

const prisma = new PrismaClient();

console.log(Object.keys(prisma));

export default class ChatRepo{
    static async createChatMessage(data: Prisma.ChatMessageCreateInput){

        return prisma.chatMessage.create({
            data, 
            include: {
                User: true,
                emotionMemory: true,
            }
        })
    }

    static async createEmotionMemory(data: Prisma.EmotionMemoryCreateInput){
        return prisma.emotionMemory.create({
            data,
            include: {
                ChatMessage: true,
                User: true,
            }
        })
    }

    static async findChatMessagesByUserId(userId: string){
        return prisma.chatMessage.findMany({
            where: { userId },
            include: {
                emotionMemory: true,
            }
        })
    }

    static async getChatMessageById(chatMessageId: string){
        return prisma.chatMessage.findUnique({
            where: { id: chatMessageId },
            include: {
                emotionMemory: true,
                User: true,
            }
        })
    }
}
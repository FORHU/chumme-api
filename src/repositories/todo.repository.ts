import {
    TTodo,
    TTodoCreateInput,
    TTodoUpdateInput,
} from "../models/todo.model";
import { prisma } from "../utils/prisma";

export default class TodoRepo {
    static async createTask(todoData: TTodoCreateInput) {
        try {
            return await prisma.todo.create({
                data: todoData,
            });
        } catch (error) {
            throw new Error(`Failed to create todo: ${error}`);
        }
    }

    static async getAll() {
        try {
            return await prisma.todo.findMany({
                orderBy: {
                    createdAt: "desc",
                },
            });
        } catch (error) {
            throw new Error(`Failed to fetch todos: ${error}`);
        }
    }

    static async getById(id: string) {
        try {
            return await prisma.todo.findUnique({
                where: { id },
            });
        } catch (error) {
            throw new Error(`Failed to fetch todo: ${error}`);
        }
    }

    static async update(updateData: TTodoUpdateInput) {
        try {
            const { id, ...data } = updateData;
            return await prisma.todo.update({
                where: { id },
                data,
            });
        } catch (error) {
            throw new Error(`Failed to update todo: ${error}`);
        }
    }

    static async delete(id: string) {
        try {
            await prisma.todo.delete({
                where: { id },
            });
            return "Successfully deleted todo.";
        } catch (error) {
            throw new Error(`Failed to delete todo: ${error}`);
        }
    }
}

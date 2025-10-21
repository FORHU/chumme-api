import { TTodoCreateInput, TTodoUpdateInput } from "../models/todo.model";
import TodoRepo from "../repositories/todo.repository";

export default class TodoSvc {
    static createTask(task: TTodoCreateInput) {
        return TodoRepo.createTask(task);
    }

    static getAll() {
        return TodoRepo.getAll();
    }

    static getById(id: string) {
        return TodoRepo.getById(id);
    }

    static update(task: TTodoUpdateInput) {
        return TodoRepo.update(task);
    }

    static delete(id: string) {
        return TodoRepo.delete(id);
    }
}
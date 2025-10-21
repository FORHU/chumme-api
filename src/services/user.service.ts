import UserRepo from "../repositories/user.repository";

export default class UserSvc {
    static async getUserById(userId: string) {
        const user = await UserRepo.findUserById(userId);
        if (!user) {
            throw "User not found";
        }
        return user;
    }
}
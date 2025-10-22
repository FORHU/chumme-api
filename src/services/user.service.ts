import UserRepo from "../repositories/user.repository";

export default class UserSvc {
    static async getUserById(userId: string) {
        const user = await UserRepo.findUserById(userId);
        if (!user) {
            throw "User not found";
        }
        return user;
    }

    static async deleteUser(userId: string) {
        const user = await UserRepo.findUserById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Invalidate all sessions
        await UserRepo.invalidateUserSessions(userId);

        // Soft delete the user
        return UserRepo.softDeleteUser(userId);
    }
}
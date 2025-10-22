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

    static async getAllUsers() {
        return UserRepo.findAllUsers();
    }

    static async updateUser(userId: string, updateData: {
        username?: string;
        name?: string;
        email?: string;
    }) {
        // Check if user exists
        const existingUser = await UserRepo.findUserById(userId);
        if (!existingUser) {
            throw new Error("User not found");
        }

        // Check email uniqueness if being updated
        if (updateData.email && updateData.email !== existingUser.email) {
            const emailExists = await UserRepo.findUserByEmail(updateData.email);
            if (emailExists) {
                throw new Error("Email already in use");
            }
        }

        // Check username uniqueness if being updated
        if (updateData.username && updateData.username !== existingUser.username) {
            const usernameExists = await UserRepo.findUserByUsername(updateData.username);
            if (usernameExists) {
                throw new Error("Username already taken");
            }
        }

        return UserRepo.updateUser(userId, updateData);
    }
}
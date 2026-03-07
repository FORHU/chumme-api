import UserRepo from "../repositories/user.repository";
import CacheUtil from "../utils/cache.util";

export default class UserSvc {
  static async getUserById(userId: string) {
    const cachedKey = `user:${userId}`;

    const cached = await CacheUtil.get(cachedKey);
    if (cached) {
      return cached;
    }

    const user = await UserRepo.findUserById(userId);
    if (!user) {
      throw "User not found";
    }

    await CacheUtil.set(cachedKey, user);

    return user;
  }

  static async deleteUser(userId: string) {
    const user = await UserRepo.findUserForAuth(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Invalidate all sessions
    await UserRepo.invalidateUserSessions(userId);

    // Soft delete the user
    const result = await UserRepo.softDeleteUser(userId);

    // Clear cache for this user (they're deleted now)
    await CacheUtil.del(`user:${userId}`);
    // Clear all users list cache (list changed)
    await CacheUtil.del(`user:all`);

    return result;
  }

  static async getAllUsers() {
    // Cache key: all users list
    const cachedKey = `user:all`;

    // Check cache
    const cached = await CacheUtil.get(cachedKey);
    if (cached) {
      return cached; // Fast return
    }

    const users = await UserRepo.findAllUsers();

    // Cache the list
    await CacheUtil.set(cachedKey, users);

    return users;
  }

  static async updateUser(
    userId: string,
    updateData: {
      username?: string;
      name?: string;
      email?: string;
      avatar?: string;
    },
  ) {
    // Check if user exists
    const existingUser = await UserRepo.findUserForAuth(userId);
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
      const usernameExists = await UserRepo.findUserByUsername(
        updateData.username,
      );
      if (usernameExists) {
        throw new Error("Username already taken");
      }
    }

    const dataToUpdate: any = { ...updateData };

    if (updateData.avatar) {
      dataToUpdate.avatar = { connect: { id: updateData.avatar } };
    }

    const updatedUser = await UserRepo.updateUser(userId, dataToUpdate);

    // Clear cache because user data changed
    await CacheUtil.del(`user:${userId}`);
    // Clear all users list (user info in list is now stale)
    await CacheUtil.del(`user:all`);

    return updatedUser;
  }
}

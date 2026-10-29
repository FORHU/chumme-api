import { Prisma, CircleVisibility } from "@prisma/client";
import ChummeCategoryAccessRepo from "../repositories/chumme-category-access.repository";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/error.util";

type CategoryVisibility = {
  id: string;
  visibility?: CircleVisibility | null;
  ownerId?: string | null;
};

/**
 * Who may see and chat in a Circle (chumme category).
 *
 * PUBLIC   — everyone.
 * PRIVATE  — listed for everyone, but only the owner and users who entered the
 *            code (a grant) may open its rooms.
 * PERSONAL — hidden from everyone except the owner and users the owner granted.
 *
 * keyPassword is the PRIVATE code and is only ever returned to the owner.
 */
export default class CircleAccessSvc {
  /**
   * Prisma filter that hides other users' PERSONAL Circles
   */
  static visibleTo(userId?: string): Prisma.ChummeCategoryWhereInput {
    if (!userId) return { visibility: { not: "PERSONAL" } };
    return {
      OR: [
        { visibility: { not: "PERSONAL" } },
        { ownerId: userId },
        { accessGrants: { some: { userId } } },
      ],
    };
  }

  static isOwner(category: CategoryVisibility, userId?: string) {
    return !!userId && category.ownerId === userId;
  }

  static async hasAccess(category: CategoryVisibility, userId?: string) {
    if (!category.visibility || category.visibility === "PUBLIC") return true;
    if (!userId) return false;
    if (this.isOwner(category, userId)) return true;
    return ChummeCategoryAccessRepo.hasGrant(category.id, userId);
  }

  /**
   * Shape a category for one viewer: adds visibility/ownerId/hasAccess and
   * strips keyPassword unless the viewer owns it
   */
  static toViewer<T extends CategoryVisibility & { keyPassword?: any }>(
    category: T,
    userId: string | undefined,
    grantedIds: Set<string>,
  ) {
    const { keyPassword, ...rest } = category;
    const isOwner = this.isOwner(category, userId);
    return {
      ...rest,
      visibility: category.visibility ?? "PUBLIC",
      ownerId: category.ownerId ?? null,
      hasAccess: isOwner || grantedIds.has(category.id),
      ...(isOwner && { keyPassword: keyPassword ?? null }),
    };
  }

  /**
   * toViewer for a list, with one grant lookup for all of it
   */
  static async toViewerList<
    T extends CategoryVisibility & { keyPassword?: any },
  >(categories: T[], userId?: string) {
    const grantedIds = new Set(
      userId
        ? await ChummeCategoryAccessRepo.getGrantedCategoryIds(
            userId,
            categories.map((c) => c.id),
          )
        : [],
    );
    return categories.map((c) => this.toViewer(c, userId, grantedIds));
  }

  /**
   * Socket payload for category_created/updated. Non-public Circles only get
   * their id, so names and codes never reach users who can't see them.
   */
  static toBroadcast<T extends CategoryVisibility & { keyPassword?: any }>(
    category: T,
  ) {
    if (category.visibility && category.visibility !== "PUBLIC") {
      return { id: category.id };
    }
    const { keyPassword, ...rest } = category;
    return { category: rest };
  }

  /**
   * Throw unless the user may open the Circle's rooms
   */
  static async assertCategoryAccess(categoryId: string, userId: string) {
    const category =
      await ChummeCategoryAccessRepo.getCategoryVisibility(categoryId);
    if (!category) throw new NotFoundError("Circle not found");
    if (!(await this.hasAccess(category, userId))) {
      // A PERSONAL Circle shouldn't be confirmed to exist
      if (category.visibility === "PERSONAL") {
        throw new NotFoundError("Circle not found");
      }
      throw new ForbiddenError(
        "This Circle is private. Enter its code to join.",
      );
    }
    return category;
  }

  /**
   * Throw unless the user may open this room (its Circle's access applies)
   */
  static async assertRoomAccess(chummeSubCategoryId: string, userId: string) {
    const category =
      await ChummeCategoryAccessRepo.getRoomCategoryVisibility(
        chummeSubCategoryId,
      );
    if (!category) throw new NotFoundError("Room does not exist");
    if (!(await this.hasAccess(category, userId))) {
      throw new ForbiddenError("You don't have access to this Circle");
    }
  }

  /**
   * Throw unless the user owns the Circle
   */
  static async assertOwner(categoryId: string, userId: string) {
    const category =
      await ChummeCategoryAccessRepo.getCategoryVisibility(categoryId);
    if (!category) throw new NotFoundError("Circle not found");
    if (!this.isOwner(category, userId)) {
      throw new ForbiddenError("Only the Circle's owner can do that");
    }
    return category;
  }

  /**
   * Enter a PRIVATE Circle's code
   */
  static async joinWithCode(
    categoryId: string,
    userId: string,
    keyPassword: string,
  ) {
    const category =
      await ChummeCategoryAccessRepo.getCategoryVisibility(categoryId);
    if (!category) throw new NotFoundError("Circle not found");

    if (this.isOwner(category, userId)) return;
    if (await ChummeCategoryAccessRepo.hasGrant(categoryId, userId)) return;

    if (category.visibility === "PERSONAL") {
      throw new NotFoundError("Circle not found");
    }
    if (category.visibility !== "PRIVATE") {
      throw new BadRequestError("This Circle is public. No code needed.");
    }

    const entered = keyPassword.trim().toUpperCase();
    if (!category.keyPassword || category.keyPassword !== entered) {
      throw new ForbiddenError("Wrong code");
    }

    await ChummeCategoryAccessRepo.createGrant(categoryId, userId);
  }

  static async listGrantedUsers(categoryId: string, ownerId: string) {
    await this.assertOwner(categoryId, ownerId);
    return ChummeCategoryAccessRepo.getGrantedUsers(categoryId);
  }

  static async grantByUsername(
    categoryId: string,
    ownerId: string,
    username: string,
  ) {
    const category = await this.assertOwner(categoryId, ownerId);
    if (category.visibility === "PUBLIC") {
      throw new BadRequestError("Everyone can already see a public Circle");
    }

    const handle = username.trim().replace(/^@/, "");
    const user = await ChummeCategoryAccessRepo.findUserByUsername(handle);
    if (!user) throw new NotFoundError(`No one with the username @${handle}`);
    if (user.id === ownerId) {
      throw new BadRequestError("You already own this Circle");
    }

    await ChummeCategoryAccessRepo.createGrant(categoryId, user.id, ownerId);
  }

  static async revoke(categoryId: string, ownerId: string, userId: string) {
    await this.assertOwner(categoryId, ownerId);
    await ChummeCategoryAccessRepo.deleteGrant(categoryId, userId);
  }
}

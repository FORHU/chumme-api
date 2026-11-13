import { prisma } from "../utils/prisma";

export interface ReplyPushTarget {
  /** Author of the message that was replied to. */
  recipientId: string;
  roomName: string;
  replierName: string;
  /** The recipient muted this Circle. */
  muted: boolean;
  /** Either of the two has blocked the other. */
  blocked: boolean;
}

export default class ReplyPushRepo {
  /**
   * Everything needed to decide whether, and how, to tell a message's author
   * about a reply. Null when the parent is gone or the replier is its author.
   */
  static async findTarget(
    parentMessageId: string,
    replierId: string,
  ): Promise<ReplyPushTarget | null> {
    const parent = await prisma.roomMessage.findUnique({
      where: { id: parentMessageId },
      select: {
        authorId: true,
        isSystem: true,
        chummeSubCategoryId: true,
        chummeSubCategory: { select: { name: true } },
      },
    });
    if (!parent || parent.isSystem || parent.authorId === replierId) {
      return null;
    }

    const recipientId = parent.authorId;
    const [membership, block, replier] = await Promise.all([
      prisma.roomUserChat.findUnique({
        where: {
          userId_chummeSubCategoryId: {
            userId: recipientId,
            chummeSubCategoryId: parent.chummeSubCategoryId,
          },
        },
        select: { muted: true },
      }),
      prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: recipientId, blockedId: replierId },
            { blockerId: replierId, blockedId: recipientId },
          ],
        },
        select: { blockerId: true },
      }),
      prisma.user.findUnique({
        where: { id: replierId },
        select: { name: true, username: true },
      }),
    ]);

    return {
      recipientId,
      roomName: parent.chummeSubCategory.name,
      replierName: replier?.name?.trim() || replier?.username || "Someone",
      muted: membership?.muted ?? false,
      blocked: block !== null,
    };
  }
}

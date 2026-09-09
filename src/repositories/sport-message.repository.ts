import { prisma } from "../utils/prisma";

/**
 * Match-room chat. Entirely separate from `room-message.repository` — sports
 * rooms have no sub-category, no membership table, no threads and no reactions.
 */

/** Everything a rendered message needs, and nothing more. */
const MESSAGE_INCLUDE = {
  author: {
    select: {
      id: true,
      username: true,
      name: true,
      avatar: { select: { fileUrl: true } },
    },
  },
  voiceMessage: {
    select: { id: true, fileUrl: true, metaData: true },
  },
  // The side. The client compares this against the team the viewer picked to
  // decide which column the message lands in.
  sportTeam: {
    select: {
      id: true,
      displayName: true,
      abbreviation: true,
      color: true,
      logoUrl: true,
    },
  },
} as const;

export default class SportMessageRepo {
  /**
   * One page of a match room, newest first.
   *
   * Cursor-based rather than offset. A match room is at its busiest exactly
   * when someone is scrolling back through it, and with `skip`/`take` every
   * message that arrives mid-scroll shifts the window — you get duplicates on
   * one page and a silently skipped message on the next. Anchoring to a message
   * id is stable no matter how fast the room moves.
   */
  static async findByEvent(params: {
    sportEventId: string;
    limit: number;
    /** Message id to page back from; omit for the newest page. */
    before?: string;
  }) {
    return prisma.sportRoomMessage.findMany({
      where: { sportEventId: params.sportEventId },
      take: params.limit,
      ...(params.before && { cursor: { id: params.before }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      include: MESSAGE_INCLUDE,
    });
  }

  static async findById(id: string) {
    return prisma.sportRoomMessage.findUnique({
      where: { id },
      include: MESSAGE_INCLUDE,
    });
  }

  static async create(data: {
    sportEventId: string;
    sportTeamId: string;
    authorId: string;
    content?: string | null;
    voiceMessageId?: string | null;
  }) {
    return prisma.sportRoomMessage.create({
      data: {
        sportEventId: data.sportEventId,
        sportTeamId: data.sportTeamId,
        authorId: data.authorId,
        content: data.content ?? null,
        voiceMessageId: data.voiceMessageId ?? null,
      },
      include: MESSAGE_INCLUDE,
    });
  }

  /**
   * The two sides a fixture allows, for validating a claimed allegiance.
   *
   * Without this check a client could post supporting any team in the database
   * — including one not playing — and the two-column UI would have nowhere to
   * put it.
   */
  static async findEventSides(sportEventId: string) {
    return prisma.sportEvent.findUnique({
      where: { id: sportEventId },
      select: { id: true, homeTeamId: true, awayTeamId: true, status: true },
    });
  }

  /**
   * Voice metadata lives on the File, matching how Circle voice notes store it,
   * so one player component can read either.
   */
  static async attachVoiceMetadata(
    fileId: string,
    meta: { duration?: number; waveform?: number[] },
  ) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { metaData: true },
    });
    if (!file) return null;

    const existing =
      file.metaData &&
      typeof file.metaData === "object" &&
      !Array.isArray(file.metaData)
        ? (file.metaData as Record<string, unknown>)
        : {};

    return prisma.file.update({
      where: { id: fileId },
      data: {
        metaData: {
          ...existing,
          ...(meta.duration !== undefined && { duration: meta.duration }),
          ...(meta.waveform !== undefined && { waveform: meta.waveform }),
        },
      },
      select: { id: true },
    });
  }

  static async deleteOwn(id: string, authorId: string) {
    const result = await prisma.sportRoomMessage.deleteMany({
      where: { id, authorId },
    });
    return result.count > 0;
  }
}

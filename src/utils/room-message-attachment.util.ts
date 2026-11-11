import { BadRequestError } from "./error.util";

/**
 * A GIF or sticker attached to a Circle message.
 *
 * The app searches KLIPY itself (KLIPY requires requests and media loads to
 * come from the end-user client, not a partner server) and sends what the
 * user picked. All the server can do is make sure it points at KLIPY's media
 * hosts and has sane dimensions, so a message can't be used to make every
 * client in the room load an arbitrary URL.
 */
export type MessageAttachment = {
  provider: "klipy";
  kind: "gif" | "sticker";
  slug: string;
  url: string;
  previewUrl?: string;
  width: number;
  height: number;
  title?: string;
};

const KLIPY_MEDIA_HOST = /^(?:static\d*\.)?klipy\.com$/;
const MAX_DIMENSION = 4096;

const isKlipyMediaUrl = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && KLIPY_MEDIA_HOST.test(url.hostname);
  } catch {
    return false;
  }
};

const isDimension = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 1 &&
  value <= MAX_DIMENSION;

/**
 * Checks what a client sent and returns only the fields we keep, or throws a
 * 400. `undefined`/`null` mean "no attachment".
 */
export const parseMessageAttachment = (
  input: unknown,
): MessageAttachment | undefined => {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new BadRequestError("Invalid attachment");
  }
  const a = input as Record<string, unknown>;

  if (a.provider !== "klipy") {
    throw new BadRequestError("Unsupported attachment provider");
  }
  if (a.kind !== "gif" && a.kind !== "sticker") {
    throw new BadRequestError("Attachment kind must be gif or sticker");
  }
  if (typeof a.slug !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(a.slug)) {
    throw new BadRequestError("Invalid attachment id");
  }
  if (!isKlipyMediaUrl(a.url)) {
    throw new BadRequestError("Attachment must be a KLIPY media URL");
  }
  if (a.previewUrl !== undefined && !isKlipyMediaUrl(a.previewUrl)) {
    throw new BadRequestError("Attachment preview must be a KLIPY media URL");
  }
  if (!isDimension(a.width) || !isDimension(a.height)) {
    throw new BadRequestError("Invalid attachment size");
  }
  if (a.title !== undefined && typeof a.title !== "string") {
    throw new BadRequestError("Invalid attachment title");
  }

  return {
    provider: "klipy",
    kind: a.kind,
    slug: a.slug,
    url: a.url,
    ...(a.previewUrl ? { previewUrl: a.previewUrl as string } : {}),
    width: Math.round(a.width),
    height: Math.round(a.height),
    ...(a.title ? { title: (a.title as string).slice(0, 200) } : {}),
  };
};

import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

/**
 * Keeps internal error details out of API responses.
 *
 * Controllers commonly answer `res.status(500).json({ message: error.message })`
 * — about 200 call sites. Most of those messages are ones we wrote ("Music not
 * found"), but when the error came from Prisma, the database driver or a
 * third-party SDK, `error.message` carries query text, column names, hosts or
 * stack frames straight to the client.
 *
 * Rather than edit every call site, this wraps `res.json` once: on an error
 * status it replaces any message that looks internal with a generic one, drops
 * stack traces and raw error objects, and logs what was withheld.
 */

export const GENERIC_SERVER_MESSAGE =
  "Something went wrong. Please try again later.";
export const GENERIC_CLIENT_MESSAGE = "The request could not be processed.";

const INTERNAL_PATTERNS: RegExp[] = [
  /prisma/i,
  /invocation/i,
  /Invalid `/,
  /Unique constraint failed/i,
  /Foreign key constraint/i,
  /does not exist in the current database/i,
  /Can't reach database server/i,
  /\b(ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN)\b/,
  /\bat \S+ \(.+:\d+:\d+\)/, // stack frame
  /\b(SELECT|INSERT|UPDATE|DELETE)\b .+\b(FROM|INTO|SET)\b/,
  /AIza[0-9A-Za-z_-]{20,}/, // Google API key
  /[?&](key|api_key|access_token)=/i,
  /Cannot read propert(y|ies) of (undefined|null)/,
  /is not a function/,
  /\w+\.amazonaws\.com/,
];

export function looksInternal(message: string): boolean {
  return INTERNAL_PATTERNS.some((pattern) => pattern.test(message));
}

/** Returns the body to send, or the same body when nothing needed hiding. */
export function sanitizeErrorBody(status: number, body: any): any {
  if (
    status < 400 ||
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return body;
  }

  const generic =
    status >= 500 ? GENERIC_SERVER_MESSAGE : GENERIC_CLIENT_MESSAGE;
  let changed = false;
  const safe: Record<string, any> = { ...body };

  if ("message" in safe) {
    const message = safe.message;
    // `message: error.message || error` serialises a whole Error object when
    // the message is empty.
    if (typeof message !== "string" || looksInternal(message)) {
      safe.message = generic;
      changed = true;
    }
  }

  for (const key of ["stack", "error", "errors", "details", "cause"]) {
    const value = safe[key];
    if (value === undefined || value === null) continue;
    // Flags like `error: true` are harmless; strings are checked; objects
    // (raw Error / SDK responses) always go.
    const unsafe =
      typeof value === "string"
        ? looksInternal(value)
        : typeof value === "object";
    if (unsafe) {
      // Joi validation details stay: they describe the caller's input.
      if (key === "details" && Array.isArray(value) && status < 500) continue;
      delete safe[key];
      changed = true;
    }
  }

  return changed ? safe : body;
}

export function safeErrorResponse(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const originalJson = res.json.bind(res);

  res.json = (body?: any) => {
    const safe = sanitizeErrorBody(res.statusCode, body);
    if (safe !== body) {
      logger.warn(
        `[SafeErrorResponse] Withheld internal error detail on ${req.method} ${req.originalUrl} (${res.statusCode})`,
        { original: body },
      );
    }
    return originalJson(safe);
  };

  next();
}

import util from "util";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import {
  isDev,
  LOG_DIR,
  LOG_LEVEL,
  LOG_MAX_FILES,
  LOG_MAX_SIZE,
} from "../config";

/**
 * File logs rotate daily and on size, are gzipped once rotated, and are pruned
 * after LOG_MAX_FILES. The old plain File transports had no cap at all — on a
 * long-running host they grow until the disk fills (see
 * INCIDENT-2026-08-25-p3009-and-disk.md).
 */
const rotatingFile = (name: string, level?: string) =>
  new DailyRotateFile({
    dirname: LOG_DIR,
    filename: `${name}-%DATE%.log`,
    datePattern: "YYYY-MM-DD",
    maxSize: LOG_MAX_SIZE,
    maxFiles: LOG_MAX_FILES,
    zippedArchive: true,
    level,
  });

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

// Readable one-liners on a developer's terminal; JSON in production so the
// container log stream stays machine-parseable.
const consoleFormat = isDev
  ? winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: "HH:mm:ss" }),
      winston.format.printf(({ timestamp, level, message, ...rest }) => {
        const extra = Object.keys(rest).length ? ` ${util.inspect(rest)}` : "";
        return `${timestamp} ${level} ${message}${extra}`;
      }),
    )
  : jsonFormat;

const baseLogger = winston.createLogger({
  level: LOG_LEVEL,
  format: jsonFormat,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    rotatingFile("error", "error"),
    rotatingFile("combined"),
  ],
});

// AI-chat timings and failures go to their own file. This used to also be a
// `level: "chat"` transport on baseLogger, but "chat" is not one of winston's
// npm levels, so winston-transport's check `levels["chat"] >= levels[info]`
// compared undefined against a number, was always false, and that transport
// silently dropped every entry. chatLogger below was the only writer that
// ever worked, so the dead transport is gone rather than given a custom level.
const chatLogger = winston.createLogger({
  level: LOG_LEVEL,
  format: jsonFormat,
  transports: [rotatingFile("chat-send")],
});

/**
 * Turn console-style arguments into a winston message plus metadata.
 *
 * winston only understands `(message: string, meta?: object)`. Without this,
 * the patterns the codebase actually uses break quietly: a primitive second
 * argument (`logger.error("Login failed", "Invalid credentials")`) is dropped,
 * a plain object's keys are merged into the log line where they can overwrite
 * `message` or `level`, and an Error passed first logs as "{}".
 */
function toEntry(
  msg: unknown,
  meta: unknown[],
): [string, Record<string, unknown>] {
  const extra: Record<string, unknown> = {};
  const parts: string[] = [];
  const objects: unknown[] = [];

  const absorb = (value: unknown) => {
    if (value instanceof Error) {
      parts.push(value.message);
      extra.stack = value.stack;
    } else if (value !== null && typeof value === "object") {
      objects.push(value);
    } else if (value !== undefined) {
      parts.push(String(value));
    }
  };

  absorb(msg);
  meta.forEach(absorb);
  if (objects.length) extra.meta = objects.length === 1 ? objects[0] : objects;

  return [parts.join(" "), extra];
}

type LogMethod = (msg: unknown, ...meta: unknown[]) => void;

const bind =
  (target: winston.Logger, level: string): LogMethod =>
  (msg, ...meta) => {
    const [message, extra] = toEntry(msg, meta);
    target.log(level, message, extra);
  };

const logger = {
  error: bind(baseLogger, "error"),
  warn: bind(baseLogger, "warn"),
  info: bind(baseLogger, "info"),
  debug: bind(baseLogger, "debug"),
  chat_response: bind(chatLogger, "info"),
  chat_error: bind(chatLogger, "error"),
};

export default logger;

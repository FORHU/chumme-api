import winston from "winston";
import { redact } from "./log-redact.util";

/**
 * Runs every entry through `redact` before it is written. An Error passed as
 * meta is merged into the entry itself, so `config`, `response` etc. arrive
 * as top-level keys and get the same drop/mask rules as nested ones. Only
 * string keys are touched — winston's Symbol keys (level, splat) stay.
 */
const redactSecrets = winston.format((info) => {
  const plain: Record<string, unknown> = {};
  for (const key of Object.keys(info)) plain[key] = info[key];
  const clean = redact(plain) as Record<string, unknown>;
  for (const key of Object.keys(info)) {
    if (!(key in clean)) delete info[key];
  }
  Object.assign(info, clean);
  return info;
});

const transports: winston.transport[] = [
  new winston.transports.Console(),
  new winston.transports.File({ filename: "error.log", level: "error" }),
  new winston.transports.File({ filename: "combined.log" }),
  new winston.transports.File({ filename: "chat-send.log", level: "chat" }),
];

const baseLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    redactSecrets(),
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports,
});

//dedicated chat logger
const chatLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    redactSecrets(),
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [new winston.transports.File({ filename: "chat-send.log" })],
});

function createModuleLogger() {
  return {
    info: (msg: string, ...meta: any[]) => baseLogger.info(`${msg}`, ...meta),
    warn: (msg: string, ...meta: any[]) => baseLogger.warn(`${msg}`, ...meta),
    error: (msg: string, ...meta: any[]) => baseLogger.error(`${msg}`, ...meta),
    debug: (msg: string, ...meta: any[]) => baseLogger.debug(`${msg}`, ...meta),
    chat_response: (msg: string, ...meta: any[]) =>
      chatLogger.info(`${msg}`, ...meta),
    chat_error: (msg: string, ...meta: any[]) =>
      chatLogger.error(`${msg}`, ...meta),
  };
}

export default createModuleLogger();

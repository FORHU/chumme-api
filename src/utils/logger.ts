import winston from "winston";

const transports: winston.transport[] = [
  new winston.transports.Console(),
  new winston.transports.File({ filename: "error.log", level: "error" }),
  new winston.transports.File({ filename: "combined.log" }),
  new winston.transports.File({ filename: "chat-send.log", level: "chat" }),
];

const baseLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports,
});

//dedicated chat logger
const chatLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
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

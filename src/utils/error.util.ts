export class NotFoundError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

export class BadRequestError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
    this.statusCode = 400;
  }
}

export class InternalServerError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = "InternalServerError";
    this.statusCode = 500;
  }
}

export const isRateLimitError = (error: any): boolean => {
  const msg = error.message?.toLowerCase() || "";
  const code = error.code || error.statusCode || error.status;
  return (
    code === 429 ||
    code === 403 ||
    msg.includes("quotaexceeded") ||
    msg.includes("ratelimitexceeded") ||
    msg.includes("rate limit exceeded") ||
    msg.includes("too many requests")
  );
};

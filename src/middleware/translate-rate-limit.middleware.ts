import rateLimit from "express-rate-limit";

/**
 * Per user, not per IP: every fan at one venue can sit behind the same NAT
 * address. 30 a minute is far above reading pace but stops a script from
 * running up the translation bill. Must come after
 * `authenticate` so `req.user` is set.
 */
export const translateRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "anonymous",
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many translations. Try again in a minute.",
  },
});

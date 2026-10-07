/**
 * Scrubs secrets out of log entries.
 *
 * SDK errors (gaxios for Google, axios, AWS) carry the whole request on the
 * error object — `config.params.key`, the full URL with `?key=…`, auth
 * headers — and winston's JSON format writes all of it. On 2026-10-06 every
 * YouTube quota error printed the API key in plain text.
 *
 * Two layers: request/transport objects are dropped by key name, and any
 * string that still contains a key or token has it masked.
 */

const MASK = "[REDACTED]";

/** Keys whose values are request plumbing, never useful in a log line. */
const DROP_KEYS = new Set([
  "config",
  "request",
  "_request",
  "socket",
  "agent",
  "httpAgent",
  "httpsAgent",
  "_httpMessage",
  "userAgentDirectives",
]);

/** Keys whose values are secrets outright. */
const SECRET_KEYS =
  /^(authorization|cookie|set-cookie|password|pass|secret|token|accesstoken|refreshtoken|idtoken|api[_-]?key|key|x-api-key|xi-api-key)$/i;

const STRING_PATTERNS: [RegExp, string][] = [
  [/AIza[0-9A-Za-z_-]{20,}/g, MASK], // Google API keys
  [/\b(sk|rk|pk)[-_][A-Za-z0-9_-]{16,}/g, MASK], // OpenAI / Stripe-style keys
  [/(Bearer\s+)[A-Za-z0-9._~+/=-]{10,}/gi, `$1${MASK}`],
  [
    /([?&](?:key|api_key|apikey|access_token|token|signature|X-Amz-Signature|X-Amz-Credential)=)[^&\s"']+/gi,
    `$1${MASK}`,
  ],
  [/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, `$1${MASK}@`], // DB passwords
  [/(amqps?:\/\/[^:\s]+:)[^@\s]+@/gi, `$1${MASK}@`],
];

export function redactString(value: string): string {
  let out = value;
  for (const [pattern, replacement] of STRING_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Returns a redacted copy. Errors become plain objects (name, message, stack
 * plus their own enumerable fields) so they survive JSON serialisation.
 */
export function redact(value: unknown, depth = 0, seen = new WeakSet()): any {
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;
  if (depth > 6) return "[Truncated]";
  if (seen.has(value as object)) return "[Circular]";
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1, seen));
  }

  const source: Record<string, unknown> =
    value instanceof Error
      ? {
          name: value.name,
          message: value.message,
          stack: value.stack,
          ...(value as any),
        }
      : (value as Record<string, unknown>);

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(source)) {
    if (DROP_KEYS.has(key)) continue;
    if (SECRET_KEYS.test(key) && child != null && child !== "") {
      out[key] = MASK;
      continue;
    }
    out[key] = redact(child, depth + 1, seen);
  }
  return out;
}

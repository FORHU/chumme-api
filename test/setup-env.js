// Loaded by mocha (--require) before any spec, so config.ts sees these at import time.
// Fake values only: unit specs stub every network and database call, and these
// placeholders keep import-time reads working on a clean checkout or CI runner.
// `||=` leaves a developer's real .env values alone.
process.env.GOOGLE_TRANSLATE_API_KEY = "test-key";
process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";
process.env.ACCESS_TOKEN_SECRET ||= "test-access-secret";
process.env.REFRESH_TOKEN_SECRET ||= "test-refresh-secret";
process.env.ACCESS_TOKEN_EXPIRY ||= "1h";

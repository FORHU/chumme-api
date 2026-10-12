-- Failed-guess counter for the live OTP. Additive with a default, so existing
-- rows and older builds are unaffected. IF NOT EXISTS keeps a re-run harmless.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "otpAttempts" INTEGER NOT NULL DEFAULT 0;

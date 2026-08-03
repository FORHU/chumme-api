-- Backfill, split out of the DDL migration so it takes only row locks on the
-- handful of rows it touches rather than an ACCESS EXCLUSIVE lock on "User".
--
-- Codes minted before otpPurpose existed carry no purpose, and every redeem
-- path now requires a matching one — so without this an in-flight verification
-- or reset code becomes silently unusable and the user just sees "Invalid
-- verification code". Registration and password-reset were the only two flows
-- that existed: an unverified account's live code can only be a verification
-- code, everything else is a reset code.
--
-- "otpCode" is not indexed, so this is a sequential scan over "User". The write
-- set is tiny (OTPs expire after 5 minutes, so almost nothing matches), but on
-- a large table the scan itself still costs a few seconds of read time. It
-- blocks nothing.
UPDATE "User"
SET "otpPurpose" = CASE
  WHEN "isEmailVerified" = false THEN 'EMAIL_VERIFICATION'::"OtpPurpose"
  ELSE 'PASSWORD_RESET'::"OtpPurpose"
END
WHERE "otpCode" IS NOT NULL
  AND "otpPurpose" IS NULL;

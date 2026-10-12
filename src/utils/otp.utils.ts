/**
 * OTP UTILITIES
 * Reusable functions for One-Time Password operations
 * Used for: Email verification, phone verification, password reset
 */

import { randomInt } from "crypto";

/** Wrong guesses a live OTP survives before it is voided. */
export const MAX_OTP_ATTEMPTS = 5;

// CSPRNG, not Math.random: V8's Math.random is a predictable xorshift, and
// these codes unlock password resets.
export const generateOTP = (): string => {
  return randomInt(100000, 1000000).toString();
};

export const getOTPExpiry = (): Date => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 5);
  return expiry;
};

export const isOTPExpired = (expiry: Date | null): boolean => {
  if (!expiry) return true;
  return new Date() > expiry;
};

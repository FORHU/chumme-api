import { OAuth2Client, TokenPayload } from "google-auth-library";
import { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_CLIENT_ID } from "../config";

// One client for the process. It caches Google's signing certificates, so the
// per-call `new OAuth2Client()` this replaces refetched them on every sign-in.
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Client IDs a token may be addressed to: the web client (Expo auth session)
 * and the Android client (native Google Sign-In). An unset one is dropped
 * rather than matched as "".
 */
const AUDIENCE = [GOOGLE_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID].filter(Boolean);

/**
 * Verify a Google ID token's signature, expiry and audience, and return its
 * claims. Throws if the token is invalid or carries no payload.
 */
export async function verifyGoogleIdToken(
  idToken: string,
): Promise<TokenPayload> {
  const ticket = await client.verifyIdToken({ idToken, audience: AUDIENCE });
  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error("Invalid Google token payload");
  }
  return payload;
}

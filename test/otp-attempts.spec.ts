import { expect } from "chai";
import { afterEach, describe, it } from "mocha";
import { OtpPurpose } from "@prisma/client";
import AuthRepo from "../src/repositories/auth.repository";
import AuthSvc from "../src/services/auth.service";
import { generateOTP, MAX_OTP_ATTEMPTS } from "../src/utils/otp.utils";

// Offline: the repository calls are stubbed, so this never reaches the database.
describe("OTP attempt limit", function () {
  const originals: Array<[any, string, any]> = [];

  const stub = (target: any, name: string, impl: (...args: any[]) => any) => {
    originals.push([target, name, target[name]]);
    target[name] = impl;
  };

  afterEach(() => {
    while (originals.length) {
      const [target, name, fn] = originals.pop()!;
      target[name] = fn;
    }
  });

  const pendingReset = (otpAttempts: number) => ({
    id: "user-1",
    email: "fan@example.com",
    otpCode: "482913",
    otpExpiry: new Date(Date.now() + 60_000),
    otpPurpose: OtpPurpose.PASSWORD_RESET,
    otpAttempts,
  });

  /** Stubs the repo; returns every updateUser payload, in order. */
  const givenUser = (user: Record<string, unknown>, reserve = true) => {
    const updates: any[] = [];
    stub(AuthRepo, "findUserByEmail", async () => user);
    stub(AuthRepo, "reserveOtpAttempt", async () => reserve);
    stub(AuthRepo, "updateUser", async (_id: string, data: any) => {
      updates.push(data);
      return user;
    });
    return updates;
  };

  const rejection = async (p: Promise<unknown>): Promise<string> => {
    try {
      await p;
    } catch (e: any) {
      return e.message;
    }
    return expect.fail("expected the code to be rejected");
  };

  const voided = (updates: any[]) =>
    updates.some((u) => u.otpCode === null && u.otpAttempts === 0);

  it("generates six-digit codes", () => {
    for (let i = 0; i < 500; i++) {
      expect(generateOTP()).to.match(/^[1-9]\d{5}$/);
    }
  });

  it("rejects a wrong code without voiding while guesses remain", async () => {
    const updates = givenUser(pendingReset(0));
    const message = await rejection(
      AuthSvc.verifyOtp("fan@example.com", "000000"),
    );
    expect(message).to.equal("Invalid verification code");
    expect(voided(updates)).to.equal(false);
  });

  it("voids the code on the last allowed wrong guess", async () => {
    const updates = givenUser(pendingReset(MAX_OTP_ATTEMPTS - 1));
    const message = await rejection(
      AuthSvc.verifyOtp("fan@example.com", "000000"),
    );
    expect(message).to.contain("Too many incorrect attempts");
    expect(voided(updates)).to.equal(true);
  });

  it("refuses even the right code once the guesses are spent", async () => {
    const updates = givenUser(pendingReset(MAX_OTP_ATTEMPTS), false);
    const message = await rejection(
      AuthSvc.verifyOtp("fan@example.com", "482913"),
    );
    expect(message).to.contain("Too many incorrect attempts");
    expect(voided(updates)).to.equal(true);
  });

  it("accepts the right code and refunds the guess", async () => {
    const updates = givenUser(pendingReset(2));
    const result: any = await AuthSvc.verifyOtp("fan@example.com", "482913");
    expect(result.message).to.equal("OTP verified");
    expect(updates).to.deep.include({ otpAttempts: { decrement: 1 } });
  });
});

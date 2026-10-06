import { expect } from "chai";
import { afterEach, describe, it } from "mocha";
import { AuthProvider } from "@prisma/client";
import AuthRepo from "../src/repositories/auth.repository";
import AuthSvc from "../src/services/auth.service";
import CacheUtil from "../src/utils/cache.util";

// Offline: the repository and cache calls login() makes are stubbed, so this
// never reaches the database or Redis.
describe("AuthSvc.login", function () {
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

  const hash = (plain: string): string => (AuthSvc as any).hashPassword(plain);

  const account = (overrides: Record<string, unknown>) => ({
    id: "user-1",
    email: "fan@example.com",
    username: "fan",
    name: "Fan",
    role: "USER",
    isEmailVerified: true,
    onboardingCompleted: true,
    authProvider: AuthProvider.EMAIL,
    password: hash("correct horse"),
    ...overrides,
  });

  const givenAccount = (user: Record<string, unknown>) => {
    stub(AuthRepo, "findUserByEmail", async () => user);
    stub(AuthRepo, "updateUserLoginStatus", async () => user);
    stub(AuthRepo, "createSession", async () => ({}));
    stub(CacheUtil, "set", async () => undefined);
  };

  const rejection = async (p: Promise<unknown>): Promise<string> => {
    try {
      await p;
    } catch (e: any) {
      return typeof e === "string" ? e : e.message;
    }
    return expect.fail("expected login to be rejected");
  };

  it("signs in a password account with the right password", async () => {
    givenAccount(account({}));
    const result: any = await AuthSvc.login({
      email: "fan@example.com",
      password: "correct horse",
    });
    expect(result.accessToken).to.be.a("string");
    expect(result.user.id).to.equal("user-1");
  });

  it("rejects a wrong password", async () => {
    givenAccount(account({}));
    const message = await rejection(
      AuthSvc.login({ email: "fan@example.com", password: "wrong" }),
    );
    expect(message).to.equal("Invalid credentials");
  });

  it("points a Google-only account at Google, with one message", async () => {
    givenAccount(
      account({ password: null, authProvider: AuthProvider.GOOGLE }),
    );
    const message = await rejection(
      AuthSvc.login({ email: "fan@example.com", password: "anything" }),
    );
    expect(message).to.contain("signs in with Google");
    expect(message).to.contain("Forgot password");
    expect(message).not.to.contain("Facebook");
  });

  it("points a Facebook-only account at Facebook", async () => {
    givenAccount(
      account({ password: null, authProvider: AuthProvider.FACEBOOK }),
    );
    const message = await rejection(
      AuthSvc.login({ email: "fan@example.com", password: "anything" }),
    );
    expect(message).to.contain("signs in with Facebook");
  });

  it("lets a Google account that set a password sign in with it", async () => {
    givenAccount(account({ authProvider: AuthProvider.GOOGLE }));
    const result: any = await AuthSvc.login({
      email: "fan@example.com",
      password: "correct horse",
    });
    expect(result.accessToken).to.be.a("string");
  });

  it("treats a leftover sentinel password as a failed login, not a crash", async () => {
    givenAccount(account({ password: "GOOGLE_SSO_USER" }));
    const message = await rejection(
      AuthSvc.login({ email: "fan@example.com", password: "GOOGLE_SSO_USER" }),
    );
    expect(message).to.equal("Invalid credentials");
  });
});

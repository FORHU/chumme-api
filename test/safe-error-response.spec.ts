import { expect } from "chai";
import { describe, it } from "mocha";
import {
  GENERIC_CLIENT_MESSAGE,
  GENERIC_SERVER_MESSAGE,
  safeErrorResponse,
  sanitizeErrorBody,
} from "../src/middleware/safe-error-response.middleware";

describe("sanitizeErrorBody", function () {
  it("leaves successful responses untouched", function () {
    const body = { message: "Invalid `prisma.user.findMany()` invocation" };
    expect(sanitizeErrorBody(200, body)).to.equal(body);
  });

  it("keeps messages we wrote ourselves", function () {
    const body = { message: "Invalid credentials" };
    expect(sanitizeErrorBody(401, body)).to.equal(body);
    const notFound = { message: "Music not found" };
    expect(sanitizeErrorBody(404, notFound)).to.equal(notFound);
  });

  it("hides Prisma errors on a 500", function () {
    const out = sanitizeErrorBody(500, {
      message:
        "Invalid `prisma.music.update()` invocation:\nThe column `Music.foo` does not exist in the current database.",
    });
    expect(out.message).to.equal(GENERIC_SERVER_MESSAGE);
  });

  it("hides internal text on a 4xx with the client-side generic", function () {
    const out = sanitizeErrorBody(400, {
      message: "Unique constraint failed on the fields: (`email`)",
    });
    expect(out.message).to.equal(GENERIC_CLIENT_MESSAGE);
  });

  it("hides connection errors, hosts and stack frames", function () {
    for (const message of [
      "connect ECONNREFUSED 10.0.1.165:5432",
      "Can't reach database server at `x.rds.amazonaws.com`:`5432`",
      "TypeError: boom\n    at MusicSvc.update (/app/dist/src/services/music.service.js:12:5)",
      "Cannot read properties of undefined (reading 'id')",
    ]) {
      expect(sanitizeErrorBody(500, { message }).message).to.equal(
        GENERIC_SERVER_MESSAGE,
        message,
      );
    }
  });

  it("hides an API key in a message", function () {
    const out = sanitizeErrorBody(502, {
      message:
        "GET https://youtube.googleapis.com/v3/search?key=AIzaSyTESTONLY000000000000000000000000 failed",
    });
    expect(out.message).to.equal(GENERIC_SERVER_MESSAGE);
  });

  it("replaces a non-string message (a serialised Error object)", function () {
    const out = sanitizeErrorBody(500, { message: { code: "P2002" } });
    expect(out.message).to.equal(GENERIC_SERVER_MESSAGE);
  });

  it("drops stack traces and raw error objects but keeps flags", function () {
    const out = sanitizeErrorBody(500, {
      message: "Failed to fetch fixture",
      stack: "Error: x\n    at y (/app/z.js:1:1)",
      error: { name: "PrismaClientKnownRequestError" },
      success: false,
    });
    expect(out).to.deep.equal({
      message: "Failed to fetch fixture",
      success: false,
    });
  });

  it("keeps Joi validation details on a 400", function () {
    const body = {
      message: '"email" is required',
      details: [{ path: ["email"], type: "any.required" }],
    };
    expect(sanitizeErrorBody(400, body)).to.equal(body);
  });

  it("ignores arrays and primitives", function () {
    const list = [{ message: "Invalid `prisma.x` invocation" }];
    expect(sanitizeErrorBody(500, list)).to.equal(list);
    expect(sanitizeErrorBody(500, "plain")).to.equal("plain");
  });
});

describe("safeErrorResponse middleware", function () {
  const run = (status: number, body: any) => {
    let sent: any;
    const res: any = {
      statusCode: status,
      json(payload: any) {
        sent = payload;
        return this;
      },
    };
    const req: any = { method: "GET", originalUrl: "/api/v1/test" };
    let nextCalled = false;
    safeErrorResponse(req, res, () => {
      nextCalled = true;
    });
    res.json(body);
    return { sent, nextCalled };
  };

  it("calls next and sanitises what the route sends", function () {
    const { sent, nextCalled } = run(500, {
      message: "Invalid `prisma.user.findUnique()` invocation",
    });
    expect(nextCalled).to.equal(true);
    expect(sent.message).to.equal(GENERIC_SERVER_MESSAGE);
  });

  it("passes a clean error body through unchanged", function () {
    const body = { message: "Fixture not found" };
    expect(run(404, body).sent).to.equal(body);
  });
});

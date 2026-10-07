import { expect } from "chai";
import { describe, it } from "mocha";
import { redact, redactString } from "../src/utils/log-redact.util";

// Placeholder secrets only — shaped like the real thing, valid nowhere.
const FAKE_GOOGLE_KEY = "AIzaSyTESTONLY000000000000000000000000";

describe("redactString", function () {
  it("masks a Google API key anywhere in a string", function () {
    const out = redactString(`quota exceeded for ${FAKE_GOOGLE_KEY}`);
    expect(out).to.not.contain(FAKE_GOOGLE_KEY);
    expect(out).to.contain("[REDACTED]");
  });

  it("masks key= and token= query params but keeps the rest of the URL", function () {
    const out = redactString(
      "https://youtube.googleapis.com/youtube/v3/search?part=id&key=abc123&maxResults=1",
    );
    expect(out).to.equal(
      "https://youtube.googleapis.com/youtube/v3/search?part=id&key=[REDACTED]&maxResults=1",
    );
  });

  it("masks bearer tokens", function () {
    expect(
      redactString("Authorization: Bearer eyJhbGciOi.payload.sig"),
    ).to.equal("Authorization: Bearer [REDACTED]");
  });

  it("masks passwords in database and RabbitMQ URLs", function () {
    expect(
      redactString("postgresql://chumme:s3cret@db.example.com:5432/main"),
    ).to.equal("postgresql://chumme:[REDACTED]@db.example.com:5432/main");
    expect(redactString("amqp://admin:hunter2@rabbitmq:5672/vhost")).to.equal(
      "amqp://admin:[REDACTED]@rabbitmq:5672/vhost",
    );
  });

  it("leaves ordinary text alone", function () {
    expect(redactString("Fixture 123 moved to HALFTIME")).to.equal(
      "Fixture 123 moved to HALFTIME",
    );
  });
});

describe("redact", function () {
  /** The shape gaxios throws on a YouTube 429 — the one that leaked the key. */
  const gaxiosError = () => {
    const error: any = new Error(
      "Quota exceeded for quota metric 'Search Queries'",
    );
    error.code = 429;
    error.status = 429;
    error.config = {
      url: `https://youtube.googleapis.com/youtube/v3/search?key=${FAKE_GOOGLE_KEY}`,
      params: { key: FAKE_GOOGLE_KEY, channelId: "UC123" },
      headers: { Authorization: "Bearer abc.def.ghi" },
    };
    error.response = {
      status: 429,
      config: error.config,
      data: { error: { code: 429, message: "Quota exceeded" } },
    };
    return error;
  };

  it("drops request configs, keeps the useful fields, leaks no key", function () {
    const out = redact(gaxiosError());
    const text = JSON.stringify(out);
    expect(text).to.not.contain(FAKE_GOOGLE_KEY);
    expect(text).to.not.contain("abc.def.ghi");
    expect(out).to.not.have.property("config");
    expect(out.response).to.not.have.property("config");
    expect(out.message).to.contain("Quota exceeded");
    expect(out.status).to.equal(429);
    expect(out.response.data.error.code).to.equal(429);
    expect(out.stack).to.be.a("string");
  });

  it("masks values under secret-named keys", function () {
    const out = redact({
      user: "fan",
      password: "correct horse",
      apiKey: "whatever",
      headers: { authorization: "Bearer x", "content-type": "json" },
    });
    expect(out.user).to.equal("fan");
    expect(out.password).to.equal("[REDACTED]");
    expect(out.apiKey).to.equal("[REDACTED]");
    expect(out.headers.authorization).to.equal("[REDACTED]");
    expect(out.headers["content-type"]).to.equal("json");
  });

  it("survives circular references", function () {
    const a: any = { name: "a" };
    a.self = a;
    expect(redact(a)).to.deep.equal({ name: "a", self: "[Circular]" });
  });

  it("does not mutate its input", function () {
    const input = { password: "x", nested: { token: "y" } };
    redact(input);
    expect(input).to.deep.equal({ password: "x", nested: { token: "y" } });
  });
});

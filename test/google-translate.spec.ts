import { expect } from "chai";
import { after, before, describe, it } from "mocha";
import axios from "axios";

// Offline: axios.post is stubbed, so this never calls Google or spends quota.
describe("Google translation provider", function () {
  let google: typeof import("../src/utils/translation/google-translate.util");
  const realPost = axios.post;
  let calls: { url: string; body: any; config: any }[] = [];

  const stubPost = (...replies: (() => any)[]) => {
    calls = [];
    let n = 0;
    (axios as any).post = async (url: string, body: any, config: any) => {
      calls.push({ url, body, config });
      return replies[Math.min(n++, replies.length - 1)]();
    };
  };

  const ok = (translatedText: string, detectedSourceLanguage?: string) => () => ({
    data: { data: { translations: [{ translatedText, detectedSourceLanguage }] } },
  });

  const fail = (status: number, message: string) => () => {
    throw { message: `Request failed with status code ${status}`, response: { status, data: { error: { code: status, message } } } };
  };

  before(async () => {
    // config.ts reads the key at import time, so set it before the first import.
    process.env.GOOGLE_TRANSLATE_API_KEY = "test-key";
    google = await import("../src/utils/translation/google-translate.util");
  });

  after(() => {
    (axios as any).post = realPost;
  });

  describe("language codes", () => {
    it("sends Chinese by region, the way v2 names it", () => {
      expect(google.toGoogleLanguageCode("zh-Hans")).to.equal("zh-CN");
      expect(google.toGoogleLanguageCode("zh-Hant")).to.equal("zh-TW");
      expect(google.toGoogleLanguageCode("ko")).to.equal("ko");
      expect(google.toGoogleLanguageCode("fil")).to.equal("fil");
    });

    it("maps detected codes back to the app's normalised form", () => {
      expect(google.fromGoogleLanguageCode("zh-CN")).to.equal("zh-Hans");
      expect(google.fromGoogleLanguageCode("zh-TW")).to.equal("zh-Hant");
      expect(google.fromGoogleLanguageCode("tl")).to.equal("fil");
      expect(google.fromGoogleLanguageCode("ko")).to.equal("ko");
      expect(google.fromGoogleLanguageCode("not a tag!!")).to.equal(null);
    });
  });

  describe("translateWithGoogle", () => {
    it("sends plain text with the key in a header and reads the reply", async () => {
      stubPost(ok("Hello, it's me", "ko"));

      const result = await google.translateWithGoogle("안녕, 나야", "en");

      expect(result).to.deep.equal({ text: "Hello, it's me", sourceLanguage: "Korean" });
      expect(calls).to.have.length(1);
      expect(calls[0].url).to.equal("https://translation.googleapis.com/language/translate/v2");
      expect(calls[0].body).to.deep.equal({ q: "안녕, 나야", target: "en", format: "text" });
      expect(calls[0].config.headers["X-Goog-Api-Key"]).to.equal("test-key");
      expect(calls[0].url).to.not.include("key=");
    });

    it("names a Filipino source Filipino, so same-language detection works", async () => {
      stubPost(ok("Kumusta ka na?", "tl"));
      const result = await google.translateWithGoogle("Kumusta ka na?", "fil");
      expect(result.sourceLanguage).to.equal("Filipino");
    });

    it("sends a zh-Hant target as zh-TW", async () => {
      stubPost(ok("你好", "en"));
      await google.translateWithGoogle("hello", "zh-Hant");
      expect(calls[0].body.target).to.equal("zh-TW");
    });

    it("retries once on a 503", async () => {
      stubPost(fail(503, "Backend Error"), ok("Hi", "ko"));
      const result = await google.translateWithGoogle("안녕", "en");
      expect(result.text).to.equal("Hi");
      expect(calls).to.have.length(2);
    });

    it("does not retry a 403 and throws the generic message", async () => {
      stubPost(fail(403, "Quota exceeded"));
      let error: any;
      try {
        await google.translateWithGoogle("안녕", "en");
      } catch (e) {
        error = e;
      }
      expect(calls).to.have.length(1);
      expect(error?.message).to.equal("Translation is unavailable right now");
    });

    it("throws on a reply with no translatedText", async () => {
      stubPost(() => ({ data: { data: { translations: [] } } }));
      let error: any;
      try {
        await google.translateWithGoogle("안녕", "en");
      } catch (e) {
        error = e;
      }
      expect(calls).to.have.length(1);
      expect(error?.message).to.equal("Translation is unavailable right now");
    });
  });
});

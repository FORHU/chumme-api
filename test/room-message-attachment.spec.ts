import { expect } from "chai";
import { describe, it } from "mocha";
import { parseMessageAttachment } from "../src/utils/room-message-attachment.util";

describe("parseMessageAttachment", function () {
  const gif = {
    provider: "klipy",
    kind: "gif",
    slug: "happy-dance-abc123",
    url: "https://static.klipy.com/ii/abc/md.webp",
    previewUrl: "https://static1.klipy.com/ii/abc/sm.webp",
    width: 498,
    height: 280.4,
    title: "Happy dance",
  };

  const status = (input: unknown) => {
    try {
      parseMessageAttachment(input);
      return 200;
    } catch (err: any) {
      return err.statusCode;
    }
  };

  it("keeps a valid KLIPY GIF, rounding its size", function () {
    expect(parseMessageAttachment(gif)).to.deep.equal({ ...gif, height: 280 });
  });

  it("accepts a sticker without the optional fields", function () {
    const { previewUrl, title, ...bare } = gif;
    expect(parseMessageAttachment({ ...bare, kind: "sticker" })).to.deep.equal({
      ...bare,
      kind: "sticker",
      height: 280,
    });
  });

  it("drops fields it doesn't know", function () {
    expect(parseMessageAttachment({ ...gif, html: "<script>" })).to.not.have.property(
      "html",
    );
  });

  it("means no attachment for undefined and null", function () {
    expect(parseMessageAttachment(undefined)).to.equal(undefined);
    expect(parseMessageAttachment(null)).to.equal(undefined);
  });

  it("refuses media from anywhere but KLIPY's hosts, or over plain http", function () {
    for (const url of [
      "https://evil.example.com/a.gif",
      "https://klipy.com.evil.example/a.gif",
      "https://static.klipy.com.evil.example/a.gif",
      "http://static.klipy.com/a.gif",
      "javascript:alert(1)",
      "not a url",
    ]) {
      expect(status({ ...gif, url }), url).to.equal(400);
      expect(status({ ...gif, previewUrl: url }), `preview ${url}`).to.equal(400);
    }
  });

  it("refuses other providers, kinds, bad ids and silly sizes", function () {
    expect(status({ ...gif, provider: "giphy" })).to.equal(400);
    expect(status({ ...gif, kind: "video" })).to.equal(400);
    expect(status({ ...gif, slug: "../../etc" })).to.equal(400);
    expect(status({ ...gif, slug: "" })).to.equal(400);
    expect(status({ ...gif, width: 0 })).to.equal(400);
    expect(status({ ...gif, height: 100000 })).to.equal(400);
    expect(status({ ...gif, width: "498" })).to.equal(400);
    expect(status("https://static.klipy.com/a.gif")).to.equal(400);
    expect(status([gif])).to.equal(400);
  });
});

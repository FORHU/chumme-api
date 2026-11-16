import { expect } from "chai";
import { describe, it } from "mocha";
import { jpegSize } from "../src/utils/media.utils";

describe("jpegSize", function () {
  // SOI, an APP0 segment to skip, then SOF0 for 480x854.
  const jpeg = (sof: number) =>
    Buffer.from([
      0xff, 0xd8,
      0xff, 0xe0, 0x00, 0x06, 0x4a, 0x46, 0x49, 0x46,
      0xff, sof, 0x00, 0x11, 0x08, 0x03, 0x56, 0x01, 0xe0, 0x03,
      0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    ]);

  it("reads a baseline frame past other segments", function () {
    expect(jpegSize(jpeg(0xc0))).to.deep.equal({ width: 480, height: 854 });
  });

  it("reads a progressive frame", function () {
    expect(jpegSize(jpeg(0xc2))).to.deep.equal({ width: 480, height: 854 });
  });

  it("skips a Huffman table, which shares the SOF marker range", function () {
    expect(jpegSize(jpeg(0xc4))).to.equal(null);
  });

  it("rejects something that isn't a JPEG", function () {
    expect(jpegSize(Buffer.from("not a jpeg"))).to.equal(null);
  });
});

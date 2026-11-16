import { expect } from "chai";
import { describe, it } from "mocha";
import { jpegSize } from "../src/utils/media.utils";

describe("jpegSize", function () {
  // SOI, an APP0 segment to skip, then a frame header (marker `sof`) for
  // 480x854: precision 08, height 0356, width 01e0, then 3 components.
  const jpeg = (sof: number) =>
    Buffer.from(
      "ffd8" +
        "ffe000064a464946" +
        `ff${sof.toString(16)}0011` +
        "08035601e003012200021101031101",
      "hex",
    );

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

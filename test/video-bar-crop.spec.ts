import { expect } from "chai";
import { describe, it } from "mocha";
import { chooseBarCrop, lastCropdetect } from "../src/utils/media.utils";

describe("lastCropdetect", function () {
  it("takes the last box ffmpeg logged", function () {
    const lines = [
      "[Parsed_cropdetect_1 @ 0x1] x1:0 x2:479 y1:0 y2:269 w:480 h:270 x:0 y:0 pts:0 t:0.0 crop=480:270:0:0",
      "frame=   3 fps=0.0 q=4.0",
      "[Parsed_cropdetect_1 @ 0x1] x1:164 x2:315 y1:0 y2:269 w:152 h:270 x:164 y:0 pts:1 t:0.03 crop=152:270:164:0",
    ];
    expect(lastCropdetect(lines)).to.deep.equal({
      w: 152,
      h: 270,
      x: 164,
      y: 0,
    });
  });

  it("is null when cropdetect said nothing", function () {
    expect(lastCropdetect(["frame=  12 fps=0.0"])).to.equal(null);
  });
});

describe("chooseBarCrop", function () {
  const landscape = { width: 480, height: 270 };

  it("cuts centred pillarbox bars off a portrait clip in a 16:9 file", function () {
    expect(
      chooseBarCrop(landscape, { w: 152, h: 270, x: 164, y: 0 }),
    ).to.deep.equal({ w: 152, h: 270, x: 164, y: 0 });
  });

  it("cuts centred letterbox bars", function () {
    const portrait = { width: 480, height: 854 };
    expect(
      chooseBarCrop(portrait, { w: 480, h: 270, x: 0, y: 292 }),
    ).to.deep.equal({ w: 480, h: 270, x: 0, y: 292 });
  });

  it("leaves a frame with no bars alone", function () {
    expect(chooseBarCrop(landscape, { w: 480, h: 270, x: 0, y: 0 })).to.equal(
      null,
    );
  });

  it("ignores a thin border", function () {
    expect(chooseBarCrop(landscape, { w: 464, h: 270, x: 8, y: 0 })).to.equal(
      null,
    );
  });

  it("ignores an off-centre box, which is dark picture rather than bars", function () {
    expect(chooseBarCrop(landscape, { w: 200, h: 270, x: 20, y: 0 })).to.equal(
      null,
    );
  });

  it("ignores a box too small to be the picture", function () {
    expect(chooseBarCrop(landscape, { w: 60, h: 270, x: 210, y: 0 })).to.equal(
      null,
    );
  });

  it("judges each axis on its own", function () {
    // Real pillarbox bars, plus a dark strip along the bottom of the picture.
    expect(
      chooseBarCrop(landscape, { w: 152, h: 230, x: 164, y: 0 }),
    ).to.deep.equal({ w: 152, h: 270, x: 164, y: 0 });
  });

  it("is null when nothing was detected", function () {
    expect(chooseBarCrop(landscape, null)).to.equal(null);
  });
});

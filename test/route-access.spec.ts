import { expect } from "chai";
import { describe, it } from "mocha";
import express from "express";
import request from "supertest";
import musicRoute from "../src/routes/music.route";
import monitoringRoute from "../src/routes/monitoring.route";
import discoveryRoute from "../src/routes/discovery.route";

// Offline: every request here is rejected by middleware (or has no route)
// before a controller could touch the database, so no stubs are needed.
// The routers are mounted at the same paths as src/routes/index.ts.
const app = express();
app.use(express.json());
app.use("/api/v1/music", musicRoute);
app.use("/api/v1/monitoring", monitoringRoute);
app.use("/api/v1/discovery", discoveryRoute);

describe("Route access", function () {
  describe("music writes need a signed-in user", function () {
    for (const [method, path] of [
      ["post", "/api/v1/music/create"],
      ["post", "/api/v1/music/create-with-json"],
      ["post", "/api/v1/music/create-with-files"],
      ["patch", "/api/v1/music/update/some-id"],
      ["delete", "/api/v1/music/delete/some-id"],
    ] as const) {
      it(`${method.toUpperCase()} ${path} → 401 without a token`, async function () {
        const res = await request(app)[method](path).send({ title: "x" });
        expect(res.status).to.equal(401);
      });
    }

    it("rejects a forged token", async function () {
      const res = await request(app)
        .post("/api/v1/music/create-with-json")
        .set("Authorization", "Bearer not-a-real-jwt")
        .send({ title: "x" });
      expect(res.status).to.equal(401);
    });
  });

  describe("monitoring is not public", function () {
    for (const path of [
      "/api/v1/monitoring/pipeline",
      "/api/v1/monitoring/worker/health",
      "/api/v1/monitoring/analytics/trends",
      "/api/v1/monitoring/content/some-id/history",
    ]) {
      it(`GET ${path} → 401 without a token`, async function () {
        const res = await request(app).get(path);
        expect(res.status).to.equal(401);
      });
    }
  });

  describe("manual crawl triggers are disabled", function () {
    it("POST /discovery/trigger-crawl has no route", async function () {
      const res = await request(app).post("/api/v1/discovery/trigger-crawl");
      expect(res.status).to.equal(404);
    });

    it("POST /discovery/trigger-crawler/:targetId has no route", async function () {
      const res = await request(app).post(
        "/api/v1/discovery/trigger-crawler/some-target",
      );
      expect(res.status).to.equal(404);
    });

    it("GET /monitoring/trigger-crawl is gone (401 before routing)", async function () {
      // Monitoring authenticates every path first, so an anonymous caller
      // gets 401 either way; the route itself is commented out.
      const res = await request(app).get("/api/v1/monitoring/trigger-crawl");
      expect(res.status).to.equal(401);
    });
  });
});

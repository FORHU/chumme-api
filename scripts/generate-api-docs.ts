/**
 * Regenerate the REST API reference from src/routes.
 *
 *   npm run docs:api
 *
 * Writes:
 *   - docs/postman/chumme-api.postman_collection.json  (Postman v2.1)
 *   - docs/postman/chumme-local.postman_environment.json
 *   - the route table in docs/REST-API-GUIDE.md, between the
 *     `<!-- routes:start -->` / `<!-- routes:end -->` markers
 *
 * Routes, methods, auth and upload fields are read from the route files, so
 * they cannot drift from the code. Sample request bodies are not derivable
 * and live in SAMPLES below — update them when a Joi schema changes.
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const ROUTES_DIR = path.join(ROOT, "src", "routes");
const DOCS_DIR = path.join(ROOT, "docs");

type Auth =
  | { kind: "none" }
  | { kind: "optional" }
  | { kind: "user" }
  | { kind: "roles"; roles: string[] };

interface Route {
  group: string;
  method: string;
  path: string;
  auth: Auth;
  upload?: { kind: "single" | "array" | "fields" | "any"; field: string };
}

// ---------------------------------------------------------------------------
// Sample bodies, keyed "METHOD /api/v1/path". Taken from the controllers' Joi
// schemas; optional fields are shown only where a client commonly sends them.
// ---------------------------------------------------------------------------
const SAMPLES: Record<string, unknown> = {
  // Auth
  "POST /api/v1/auth/register": {
    email: "fan@example.com",
    password: "secret123",
    username: "kpopfan",
    name: "Kpop Fan",
  },
  "POST /api/v1/auth/verify-email": {
    email: "fan@example.com",
    otpCode: "123456",
  },
  "POST /api/v1/auth/resend-verification-otp": { email: "fan@example.com" },
  "POST /api/v1/auth/login": { email: "{{email}}", password: "{{password}}" },
  "POST /api/v1/auth/refresh-token": { refreshToken: "{{refreshToken}}" },
  "POST /api/v1/auth/forgot-password": { email: "fan@example.com" },
  "POST /api/v1/auth/verify-otp": {
    email: "fan@example.com",
    otpCode: "123456",
  },
  "POST /api/v1/auth/reset-password": {
    email: "fan@example.com",
    otpCode: "123456",
    newPassword: "newsecret123",
  },
  "POST /api/v1/auth/google-sso": { idToken: "<Google ID token>" },
  "POST /api/v1/auth/facebook-sso": { accessToken: "<Facebook access token>" },
  "POST /api/v1/auth/logout": { refreshToken: "{{refreshToken}}" },
  "POST /api/v1/auth/change-password/request": { currentPassword: "secret123" },
  "POST /api/v1/auth/change-password/confirm": {
    currentPassword: "secret123",
    otpCode: "123456",
    newPassword: "newsecret123",
    refreshToken: "{{refreshToken}}",
  },
  "POST /api/v1/auth/change-email/request": { email: "new@example.com" },
  "POST /api/v1/auth/change-email/confirm": { otpCode: "123456" },

  // Users
  "PATCH /api/v1/users/me": { username: "kpopfan", name: "Kpop Fan" },
  "POST /api/v1/users/admin": {
    email: "admin@example.com",
    password: "secret123",
    username: "admin",
  },
  "PATCH /api/v1/users/:id/status": { isActive: false },

  // Categories (Circles)
  "POST /api/v1/chumme-categories/create": {
    name: "BTS ARMY Manila",
    isAd: false,
    traits: "COMMUNITIES",
    keyPassword: null,
    emojiIcon: "💜",
    tags: ["bts", "manila"],
    targetCountries: ["PH"],
  },
  "PUT /api/v1/chumme-categories/:id": {
    name: "BTS ARMY Manila",
    note: "Updated",
  },
  "POST /api/v1/chumme-categories/:categoryId/subcategories/bulk-delete": {
    ids: ["00000000-0000-0000-0000-000000000000"],
  },

  // Subcategories (rooms inside a Circle)
  "POST /api/v1/chumme-subcategories/create": {
    name: "Concert meetup",
    chummeCategoryId: "{{categoryId}}",
    isAd: false,
    traits: "COMMUNITIES",
  },
  "PUT /api/v1/chumme-subcategories/:id": { name: "Concert meetup (Day 2)" },

  // Music studios (karaoke rooms)
  "POST /api/v1/music-studios/create": {
    name: "Friday night crowd singing",
    studioType: "CROWDSINGING",
    keyPassword: null,
    note: "Everyone welcome",
  },
  "POST /api/v1/music-studios/:studioId/join": { role: "LISTENER" },
  "PATCH /api/v1/music-studios/:studioId": { name: "Renamed studio" },
  "PATCH /api/v1/music-studios/:studioId/members/:userId/role": {
    role: "SINGER",
  },
  "POST /api/v1/music-studios/:studioId/start-recording": {
    clientTimestamp: 1760000000000,
    musicId: "{{musicId}}",
  },
  "POST /api/v1/music-studios/:studioId/stop-recording": {
    clientTimestamp: 1760000030000,
  },
  "POST /api/v1/music-studios/:studioId/save-recording": {
    musicId: "{{musicId}}",
    duration: 30,
    performanceMapping: [{ startLine: 0, endLine: 4, singerId: "{{userId}}" }],
  },

  // Playlists
  "POST /api/v1/playlists/create": {
    name: "Concert warm-up",
    description: "Songs we sing before the show",
    isPublic: true,
  },
  "PATCH /api/v1/playlists/update/:id": {
    name: "Concert warm-up",
    description: "",
  },
  "PATCH /api/v1/playlists/:id": {
    name: "Concert warm-up",
    trackOrder: [{ musicId: "{{musicId}}", order: 0 }],
  },
  "POST /api/v1/playlists/:id/tracks": { musicId: "{{musicId}}", order: 0 },
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Text from `open` (an index just past "(") to its matching ")". */
function balanced(src: string, open: number): string {
  let depth = 1;
  let i = open;
  let quote: string | null = null;
  for (; i < src.length && depth > 0; i++) {
    const c = src[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
  }
  return src.slice(open, i - 1);
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** Auth and upload info from a route's middleware arguments. */
function readMiddleware(
  args: string,
  inherited: Auth,
): Pick<Route, "auth" | "upload"> {
  let auth: Auth = inherited;
  const roles = args.match(/requireRoles\(\s*\[([^\]]*)\]/);
  if (roles) {
    auth = {
      kind: "roles",
      roles: roles[1]
        .split(",")
        .map((r) =>
          r
            .trim()
            .replace(/^UserRole\./, "")
            .replace(/["']/g, ""),
        )
        .filter(Boolean),
    };
  } else if (/\bauthenticate\b/.test(args)) {
    auth = { kind: "user" };
  } else if (/\boptionalAuthenticate\b/.test(args) && auth.kind === "none") {
    auth = { kind: "optional" };
  }

  // multer: .single("x") / .array("x") name the field; .fields([...]) and
  // .any() accept several, so the guide says "any" and Postman offers `file`.
  const up = args.match(
    /\b\w+\.(single|array|fields|any)\(\s*(["'`])?([\w-]*)/,
  );
  const upload = up
    ? {
        kind: up[1] as "single" | "array" | "fields" | "any",
        field:
          up[1] === "single" || up[1] === "array" ? up[3] || "file" : "any",
      }
    : undefined;
  return { auth, upload };
}

function parseRouteFile(file: string, mount: string, group: string): Route[] {
  const src = stripComments(fs.readFileSync(file, "utf8"));
  const routerVars = [
    ...src.matchAll(
      /(?:const|let)\s+(\w+)\s*(?::\s*\w+)?\s*=\s*(?:express\.)?Router\(\)/g,
    ),
  ].map((m) => m[1]);
  if (!routerVars.length) return [];
  const names = routerVars.join("|");

  // Router-level middleware applies only to routes declared after it.
  const uses = [
    ...src.matchAll(new RegExp(`\\b(?:${names})\\.use\\(`, "g")),
  ].map((m) => ({ at: m.index!, args: balanced(src, m.index! + m[0].length) }));

  const routes: Route[] = [];
  const re = new RegExp(
    `\\b(?:${names})\\.(get|post|put|patch|delete)\\(`,
    "g",
  );
  for (const m of src.matchAll(re)) {
    const args = balanced(src, m.index! + m[0].length);
    const p = args.match(/^\s*(["'`])([^"'`]*)\1/);
    if (!p) continue;

    let inherited: Auth = { kind: "none" };
    for (const u of uses) {
      if (u.at < m.index!) inherited = readMiddleware(u.args, inherited).auth;
    }
    const rest = args.slice(p[0].length);
    const sub = p[2] === "/" ? "" : p[2];
    routes.push({
      group,
      method: m[1].toUpperCase(),
      path: `/api${mount}${sub}`.replace(/\/+/g, "/"),
      ...readMiddleware(rest, inherited),
    });
  }
  return routes;
}

function collectRoutes(): Route[] {
  const index = fs.readFileSync(path.join(ROUTES_DIR, "index.ts"), "utf8");
  const imports = new Map<string, string>();
  for (const m of index.matchAll(/^import\s+(\w+)\s+from\s+"\.\/([^"]+)";/gm)) {
    imports.set(m[1], m[2]);
  }
  const routes: Route[] = [];
  for (const m of index.matchAll(
    /router\.use\(\s*"([^"]+)"\s*,\s*(\w+)\s*\)/g,
  )) {
    const [, mount, ident] = m;
    const rel = imports.get(ident);
    if (!rel) continue;
    const file = path.join(ROUTES_DIR, rel.endsWith(".ts") ? rel : `${rel}.ts`);
    const group = mount.replace(/^\/v1\/?/, "") || "health";
    routes.push(...parseRouteFile(file, mount, group));
  }
  // Inline route in index.ts itself.
  if (/router\.get\(\s*"\/v1"/.test(index)) {
    routes.push({
      group: "health",
      method: "GET",
      path: "/api/v1",
      auth: { kind: "none" },
    });
  }
  return routes;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const authLabel = (a: Auth): string =>
  a.kind === "none"
    ? "Public"
    : a.kind === "optional"
      ? "Optional"
      : a.kind === "user"
        ? "User"
        : a.roles.join(", ");

function toPostmanItem(r: Route) {
  const key = `${r.method} ${r.path}`;
  const url = r.path.replace(/^\/api/, "{{baseUrl}}");
  const request: any = {
    method: r.method,
    header: [],
    url: {
      raw: url,
      host: ["{{baseUrl}}"],
      path: url.replace("{{baseUrl}}/", "").split("/"),
    },
    auth:
      r.auth.kind === "none"
        ? { type: "noauth" }
        : {
            type: "bearer",
            bearer: [{ key: "token", value: "{{authToken}}", type: "string" }],
          },
  };
  if (r.upload) {
    request.body = {
      mode: "formdata",
      formdata: [
        {
          key: r.upload.field === "any" ? "file" : r.upload.field,
          type: "file",
          src: [],
        },
      ],
    };
  } else if (SAMPLES[key] !== undefined) {
    request.header.push({ key: "Content-Type", value: "application/json" });
    request.body = {
      mode: "raw",
      raw: JSON.stringify(SAMPLES[key], null, 2),
      options: { raw: { language: "json" } },
    };
  }
  const item: any = { name: key.replace(" /api/v1", " "), request };
  if (key === "POST /api/v1/auth/login") {
    item.event = [
      {
        listen: "test",
        script: {
          type: "text/javascript",
          exec: [
            "// Store tokens so every other request is authenticated.",
            "const body = pm.response.json();",
            "if (body && body.data && body.data.accessToken) {",
            "  pm.collectionVariables.set('authToken', body.data.accessToken);",
            "  pm.collectionVariables.set('refreshToken', body.data.refreshToken);",
            "  pm.collectionVariables.set('userId', body.data.user.id);",
            "}",
          ],
        },
      },
    ];
  }
  return item;
}

function writeCollection(routes: Route[]) {
  const groups = new Map<string, Route[]>();
  for (const r of routes) {
    if (!groups.has(r.group)) groups.set(r.group, []);
    groups.get(r.group)!.push(r);
  }
  // Auth first, so "login" is the first thing a new user sees.
  const order = [...groups.keys()].sort((a, b) =>
    a === "auth" ? -1 : b === "auth" ? 1 : a.localeCompare(b),
  );
  const collection = {
    info: {
      name: "Chumme API",
      description:
        "Generated from src/routes by `npm run docs:api` — edit the routes or scripts/generate-api-docs.ts, not this file. See docs/REST-API-GUIDE.md.",
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      { key: "authToken", value: "" },
      { key: "refreshToken", value: "" },
      { key: "userId", value: "" },
    ],
    item: order.map((g) => ({
      name: g,
      item: groups.get(g)!.map(toPostmanItem),
    })),
  };
  const dir = path.join(DOCS_DIR, "postman");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "chumme-api.postman_collection.json"),
    JSON.stringify(collection, null, 2) + "\n",
  );
  const env = {
    name: "Chumme local",
    values: [
      { key: "baseUrl", value: "http://localhost:3002/api/v1", enabled: true },
      { key: "email", value: "", enabled: true },
      { key: "password", value: "", type: "secret", enabled: true },
      { key: "categoryId", value: "", enabled: true },
      { key: "musicId", value: "", enabled: true },
    ],
  };
  fs.writeFileSync(
    path.join(dir, "chumme-local.postman_environment.json"),
    JSON.stringify(env, null, 2) + "\n",
  );
}

function writeGuideTable(routes: Route[]) {
  const guide = path.join(DOCS_DIR, "REST-API-GUIDE.md");
  const text = fs.readFileSync(guide, "utf8");
  const start = "<!-- routes:start -->";
  const end = "<!-- routes:end -->";
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  if (a < 0 || b < a)
    throw new Error(`${guide} is missing the route-table markers`);

  const counts = { Public: 0 };
  const rows = routes
    .slice()
    .sort(
      (x, y) =>
        x.path.localeCompare(y.path) || x.method.localeCompare(y.method),
    )
    .map((r) => {
      if (r.auth.kind === "none") counts.Public++;
      const sample = SAMPLES[`${r.method} ${r.path}`] !== undefined ? "✓" : "";
      const upload = r.upload ? `\`${r.upload.field}\`` : "";
      return `| ${r.method} | \`${r.path}\` | ${authLabel(r.auth)} | ${upload} | ${sample} |`;
    });
  const table = [
    "",
    `${routes.length} routes, ${counts.Public} public. **Auth** column: Public = no token; User = any signed-in user; Optional = token used if sent; role names = that role required (DEVELOPER always passes \`requireRoles\`). **Upload** = multipart field name. **Sample** = a body is filled in the Postman collection.`,
    "",
    "| Method | Path | Auth | Upload | Sample |",
    "|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
  fs.writeFileSync(
    guide,
    text.slice(0, a + start.length) + "\n" + table + text.slice(b),
  );
}

const routes = collectRoutes();
writeCollection(routes);
writeGuideTable(routes);

const unused = Object.keys(SAMPLES).filter(
  (k) => !routes.some((r) => `${r.method} ${r.path}` === k),
);
console.log(`${routes.length} routes documented.`);
if (unused.length) {
  console.warn(
    `Samples that match no route (fix the key or drop it):\n  ${unused.join("\n  ")}`,
  );
  process.exitCode = 1;
}

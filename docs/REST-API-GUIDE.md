# Chumme REST API Guide

How to call the Chumme API: base URL, authentication, conventions, and every route with its auth requirement. The route table at the bottom and the Postman collection are **generated from `src/routes`**. Run `npm run docs:api` after changing a route, and commit the result.

- Postman collection: [`docs/postman/chumme-api.postman_collection.json`](postman/chumme-api.postman_collection.json)
- Postman environment (local): [`docs/postman/chumme-local.postman_environment.json`](postman/chumme-local.postman_environment.json)
- Realtime (karaoke studios, Circles chat) runs over Socket.IO on the same host and port. It is not covered here.

## Base URL

| Environment | Base URL |
|---|---|
| Local | `http://localhost:3002/api/v1` |
| Staging (EC2) | `http://<ec2-host>:3002/api/v1` until HTTPS is live (see `docs/HTTPS-SETUP.md`) |

Every path in this guide starts with `/api/v1`. `GET /api/v1/health` reports API, Redis, RabbitMQ and database status.

## Authentication

The API uses bearer JWTs. Cookies are not involved.

1. **Sign in.** `POST /auth/login` with `{ "email", "password" }`, or `POST /auth/google-sso` with `{ "idToken" }`. The response is:
   ```json
   {
     "message": "Login successful",
     "data": {
       "accessToken": "eyJ…",
       "refreshToken": "eyJ…",
       "user": { "id": "…", "email": "…", "username": "…", "role": "USER", "onboardingCompleted": true }
     }
   }
   ```
2. **Call the API** with `Authorization: Bearer <accessToken>`. Access tokens expire after `ACCESS_TOKEN_EXPIRY` (1 day on staging).
3. **Refresh** with `POST /auth/refresh-token` `{ "refreshToken" }`. Refresh tokens last 7 days and are stored server-side, so `POST /auth/logout` revokes one.

An unverified account gets `requiresVerification: true` from login instead of tokens, and a fresh code is emailed. Finish with `POST /auth/verify-email` `{ "email", "otpCode" }`. Codes are 6 digits and expire after 5 minutes.

Accounts created through Google or Facebook have no password. A password login on one returns a single message naming the provider. The owner can add a password through `POST /auth/forgot-password` followed by `POST /auth/reset-password`.

### Auth levels in the route table

| Label | Meaning |
|---|---|
| Public | No token needed |
| User | Any signed-in user (`authenticate`) |
| Optional | Works without a token; a sent token identifies the caller (`optionalAuthenticate`) |
| `ADMIN`, `CREATOR`, … | `authenticate` plus `requireRoles([...])`. `DEVELOPER` passes every role check. |

> Several Public and User routes below perform admin-level actions (APK publishing, cache flush, crawl triggers, category edits) with no role check. They are listed as they are, and `CODEBASE-AUDIT-2026-10-05.md` tracks them as findings. Do not treat "Public" here as "intended to be public".

## Conventions

- **Bodies** are JSON (`Content-Type: application/json`), except the routes with an **Upload** field in the table. Those take `multipart/form-data` with the file under that field name; `any` means several named file fields are accepted.
- **Validation** uses Joi in the controllers. A rejected body returns `400` with `{ "message": "<what is wrong>" }`.
- **Errors** are `{ "message": "…" }`, with `401` for a missing, invalid or expired token and `403` for a missing role. Some newer routes (moderation, sports) return `{ "success": false, "message": "…" }`.
- **IDs** are UUIDs.
- **Pagination** is per endpoint, not yet uniform. Where supported it is `?page=&limit=` (music studios, chat and room messages) or `?limit=&before=<message id>` (sport room messages). Most list endpoints return everything; this is OJT Task 2.7.

## Core endpoints

The groups a new client touches first. Every request below has a filled-in body in the Postman collection.

### Auth: `/auth`

| Call | Body |
|---|---|
| `POST /auth/register` | `{ "email", "password" (6+), "username", "name"? }`, which emails a verification code |
| `POST /auth/verify-email` | `{ "email", "otpCode" }` |
| `POST /auth/login` | `{ "email", "password" }`. Optional `idToken` / `accessToken` link Google / Facebook to the account. |
| `POST /auth/google-sso` | `{ "idToken" }` from Google Sign-In; creates the account on first use |
| `POST /auth/refresh-token` | `{ "refreshToken" }` |
| `POST /auth/forgot-password` → `POST /auth/reset-password` | `{ "email" }`, then `{ "email", "otpCode", "newPassword" }` |
| `POST /auth/change-password/request` → `…/confirm` | Signed in. `{ "currentPassword" }`, then `{ "currentPassword", "otpCode", "newPassword", "refreshToken"? }`. Other sessions are signed out; the one whose `refreshToken` you send survives. |
| `POST /auth/change-email/request` → `…/confirm` | Signed in. `{ "email" }` (the code goes to the new address), then `{ "otpCode" }` |

### Users: `/users`

| Call | Notes |
|---|---|
| `GET /users/me` | The signed-in user |
| `PATCH /users/me` | `{ "username"?, "name"?, "avatar"? (file id) }` |
| `DELETE /users/me` | Soft-deletes the account and releases its email and username |
| `POST /users/:id/block`, `DELETE /users/:id/block`, `GET /users/me/blocks` | Block list |

### Circles: `/chumme-categories` and `/chumme-subcategories`

A Circle is a `ChummeCategory`; the rooms inside it are `ChummeSubCategory` rows. `keyPassword: null` makes a Circle or room public.

```json
POST /chumme-categories/create
{ "name": "BTS ARMY Manila", "isAd": false, "traits": "COMMUNITIES", "keyPassword": null,
  "emojiIcon": "💜", "tags": ["bts", "manila"], "targetCountries": ["PH"] }
```

`traits` is `NONE`, `COMMUNITIES` or `ENTERTAINMENT`. `GET /chumme-categories/communities` and `/entertainment` list by trait. `GET /chumme-categories/:categoryId/subcategories?password=` opens a private Circle.

### Karaoke studios: `/music-studios`

```json
POST /music-studios/create
{ "name": "Friday night crowd singing", "studioType": "CROWDSINGING", "keyPassword": null }
```

`studioType` is `CROWDSINGING`, `RELAYSINGING` or `COMPETITION`. Join with `POST /music-studios/:studioId/join` `{ "role": "LISTENER" | "SINGER" | "PRODUCER", "keyPassword"? }`. Recording is `start-recording` → `stop-recording` → `save-recording` `{ "musicId", "duration"?, "performanceMapping"? }`. Live studio state (queue, presence, singer handoff) is on Socket.IO.

### Playlists: `/playlists`

`POST /playlists/create` `{ "name", "description"?, "isPublic"? }` · `POST /playlists/:id/tracks` `{ "musicId", "order"? }` · `PATCH /playlists/:id` reorders with `trackOrder: [{ "musicId", "order" }]` · `POST /playlists/:id/cover` uploads a `cover` image.

## Using the Postman collection

1. Import both files from `docs/postman/` and select the **Chumme local** environment.
2. Set `email` and `password` in the environment to a verified local account.
3. Run **auth → POST /auth/login**. Its test script stores `authToken`, `refreshToken` and `userId` as collection variables, and every authenticated request uses `{{authToken}}`.
4. Fill `categoryId` / `musicId` as you go; samples reference them.

Point `baseUrl` at a local API with a local database. Several requests delete or flush data.

## All routes

Generated by `npm run docs:api`. Do not edit by hand.

<!-- routes:start -->

224 routes, 48 public. **Auth** column: Public = no token; User = any signed-in user; Optional = token used if sent; role names = that role required (DEVELOPER always passes `requireRoles`). **Upload** = multipart field name. **Sample** = a body is filled in the Postman collection.

| Method | Path | Auth | Upload | Sample |
|---|---|---|---|---|
| GET | `/api/v1` | Public |  |  |
| GET | `/api/v1/apk` | Public |  |  |
| DELETE | `/api/v1/apk/:id` | Public |  |  |
| PUT | `/api/v1/apk/:id` | Public |  |  |
| PATCH | `/api/v1/apk/:id/set-latest` | Public |  |  |
| PATCH | `/api/v1/apk/:id/set-stable` | Public |  |  |
| GET | `/api/v1/apk/download/:id` | Public |  |  |
| POST | `/api/v1/apk/upload` | Public | `apk` |  |
| GET | `/api/v1/artist-persona` | User |  |  |
| POST | `/api/v1/artist-persona` | User |  |  |
| PATCH | `/api/v1/artist-persona/:id` | User |  |  |
| GET | `/api/v1/artists` | User |  |  |
| POST | `/api/v1/artists` | CREATOR, ADMIN |  |  |
| DELETE | `/api/v1/artists/:id` | CREATOR, ADMIN |  |  |
| GET | `/api/v1/artists/:id` | User |  |  |
| PUT | `/api/v1/artists/:id` | CREATOR, ADMIN |  |  |
| GET | `/api/v1/artists/live` | User |  |  |
| GET | `/api/v1/artists/me` | User |  |  |
| POST | `/api/v1/artists/me` | User |  |  |
| DELETE | `/api/v1/artists/me/:artistId` | User |  |  |
| POST | `/api/v1/artists/skip-onboarding` | User |  |  |
| GET | `/api/v1/artists/with-music` | User |  |  |
| POST | `/api/v1/auth/change-email/cancel` | User |  |  |
| POST | `/api/v1/auth/change-email/confirm` | User |  | ✓ |
| POST | `/api/v1/auth/change-email/request` | User |  | ✓ |
| POST | `/api/v1/auth/change-password/confirm` | User |  | ✓ |
| POST | `/api/v1/auth/change-password/request` | User |  | ✓ |
| POST | `/api/v1/auth/facebook-sso` | Public |  | ✓ |
| POST | `/api/v1/auth/forgot-password` | Public |  | ✓ |
| POST | `/api/v1/auth/google-sso` | Public |  | ✓ |
| POST | `/api/v1/auth/login` | Public |  | ✓ |
| POST | `/api/v1/auth/logout` | User |  | ✓ |
| POST | `/api/v1/auth/refresh-token` | Public |  | ✓ |
| POST | `/api/v1/auth/register` | Public |  | ✓ |
| POST | `/api/v1/auth/resend-verification-otp` | Public |  | ✓ |
| POST | `/api/v1/auth/reset-password` | Public |  | ✓ |
| POST | `/api/v1/auth/verify-email` | Public |  | ✓ |
| POST | `/api/v1/auth/verify-otp` | Public |  | ✓ |
| GET | `/api/v1/bookmark/me` | User |  |  |
| POST | `/api/v1/bookmark/upsert` | User |  |  |
| POST | `/api/v1/chat-wonder/send` | User |  |  |
| POST | `/api/v1/chat-wonder/stream` | User |  |  |
| GET | `/api/v1/chat/conversation` | User |  |  |
| GET | `/api/v1/chat/id/:chatId` | User |  |  |
| GET | `/api/v1/chat/list` | User |  |  |
| POST | `/api/v1/chat/send` | User |  |  |
| GET | `/api/v1/chumme-categories` | User |  |  |
| GET | `/api/v1/chumme-categories/:categoryId/subcategories` | User |  |  |
| POST | `/api/v1/chumme-categories/:categoryId/subcategories/bulk-delete` | User |  | ✓ |
| DELETE | `/api/v1/chumme-categories/:id` | User |  |  |
| GET | `/api/v1/chumme-categories/:id` | User |  |  |
| PUT | `/api/v1/chumme-categories/:id` | User |  | ✓ |
| GET | `/api/v1/chumme-categories/communities` | User |  |  |
| POST | `/api/v1/chumme-categories/create` | User |  | ✓ |
| GET | `/api/v1/chumme-categories/entertainment` | User |  |  |
| GET | `/api/v1/chumme-categories/specialized/:trait` | User |  |  |
| GET | `/api/v1/chumme-subcategories` | User |  |  |
| DELETE | `/api/v1/chumme-subcategories/:id` | User |  |  |
| GET | `/api/v1/chumme-subcategories/:id` | User |  |  |
| PUT | `/api/v1/chumme-subcategories/:id` | User |  | ✓ |
| GET | `/api/v1/chumme-subcategories/category/:categoryId` | User |  |  |
| POST | `/api/v1/chumme-subcategories/create` | User |  | ✓ |
| GET | `/api/v1/chumme-topic-categories` | Public |  |  |
| POST | `/api/v1/chumme-topic-categories` | Public |  |  |
| DELETE | `/api/v1/chumme-topic-categories/:id` | Public |  |  |
| GET | `/api/v1/chumme-topic-categories/:id` | Public |  |  |
| PATCH | `/api/v1/chumme-topic-categories/:id` | Public |  |  |
| GET | `/api/v1/conversations` | User |  |  |
| POST | `/api/v1/conversations` | User |  |  |
| DELETE | `/api/v1/conversations/:id` | User |  |  |
| GET | `/api/v1/conversations/:id` | User |  |  |
| GET | `/api/v1/conversations/:id/messages` | User |  |  |
| PATCH | `/api/v1/conversations/:id/title` | User |  |  |
| GET | `/api/v1/discovery/rising-stars` | Public |  |  |
| GET | `/api/v1/discovery/trending` | Public |  |  |
| POST | `/api/v1/discovery/trigger-crawl` | Public |  |  |
| POST | `/api/v1/discovery/trigger-crawler/:targetId` | Public |  |  |
| GET | `/api/v1/emotions` | User |  |  |
| GET | `/api/v1/emotions/me` | User |  |  |
| POST | `/api/v1/emotions/me` | User |  |  |
| DELETE | `/api/v1/emotions/me/:id` | User |  |  |
| GET | `/api/v1/feed` | Public |  |  |
| POST | `/api/v1/feed/:id/comment` | User |  |  |
| GET | `/api/v1/feed/:id/comments` | Public |  |  |
| GET | `/api/v1/feed/personalized` | User |  |  |
| GET | `/api/v1/files` | User |  |  |
| POST | `/api/v1/files` | User |  |  |
| DELETE | `/api/v1/files/:id` | User |  |  |
| GET | `/api/v1/files/:id` | User |  |  |
| GET | `/api/v1/files/download/:id` | User |  |  |
| GET | `/api/v1/files/get-download-url` | User |  |  |
| POST | `/api/v1/files/get-upload-url` | User |  |  |
| POST | `/api/v1/files/upload` | User | `file` |  |
| PUT | `/api/v1/files/upsert` | User |  |  |
| GET | `/api/v1/health` | Public |  |  |
| GET | `/api/v1/health/rabbitmq` | Public |  |  |
| POST | `/api/v1/ingestion-schedules` | User |  |  |
| DELETE | `/api/v1/ingestion-schedules/:id` | User |  |  |
| PUT | `/api/v1/ingestion-schedules/:id` | User |  |  |
| GET | `/api/v1/ingestion-schedules/target/:targetId` | User |  |  |
| GET | `/api/v1/interests` | User |  |  |
| GET | `/api/v1/interests/me` | User |  |  |
| POST | `/api/v1/interests/me` | User |  |  |
| DELETE | `/api/v1/interests/me/:id` | User |  |  |
| GET | `/api/v1/media/metadata` | User |  |  |
| POST | `/api/v1/media/process` | User |  |  |
| GET | `/api/v1/media/thumbnail` | User |  |  |
| GET | `/api/v1/monitoring/analytics/trends` | Public |  |  |
| GET | `/api/v1/monitoring/content/:id/history` | Public |  |  |
| GET | `/api/v1/monitoring/pipeline` | Public |  |  |
| GET | `/api/v1/monitoring/trigger-crawl` | Public |  |  |
| GET | `/api/v1/monitoring/trigger-crawl/content/:platform/:externalId` | Public |  |  |
| GET | `/api/v1/monitoring/trigger-crawl/target/:id` | Public |  |  |
| GET | `/api/v1/monitoring/trigger-scout` | Public |  |  |
| GET | `/api/v1/monitoring/worker/health` | Public |  |  |
| GET | `/api/v1/music-albums/:id` | User |  |  |
| POST | `/api/v1/music-albums/create` | User |  |  |
| DELETE | `/api/v1/music-albums/delete/:id` | User |  |  |
| GET | `/api/v1/music-albums/list` | User |  |  |
| PATCH | `/api/v1/music-albums/update/:id` | User |  |  |
| POST | `/api/v1/music-library` | User |  |  |
| DELETE | `/api/v1/music-library/:id` | User |  |  |
| GET | `/api/v1/music-library/:id` | User |  |  |
| GET | `/api/v1/music-library/get-download-url` | User |  |  |
| POST | `/api/v1/music-library/get-upload-url` | User |  |  |
| POST | `/api/v1/music-library/upload` | User | `file` |  |
| POST | `/api/v1/music-records` | User |  |  |
| DELETE | `/api/v1/music-records/:id` | User |  |  |
| GET | `/api/v1/music-records/:id` | User |  |  |
| GET | `/api/v1/music-records/album/:userId` | User |  |  |
| GET | `/api/v1/music-records/list` | User |  |  |
| GET | `/api/v1/music-records/music/:musicId` | User |  |  |
| GET | `/api/v1/music-records/studio/:studioId` | User |  |  |
| DELETE | `/api/v1/music-studios/:studioId` | User |  |  |
| GET | `/api/v1/music-studios/:studioId` | User |  |  |
| PATCH | `/api/v1/music-studios/:studioId` | User |  | ✓ |
| POST | `/api/v1/music-studios/:studioId/join` | User |  | ✓ |
| POST | `/api/v1/music-studios/:studioId/leave` | User |  |  |
| PATCH | `/api/v1/music-studios/:studioId/members/:userId/role` | User |  | ✓ |
| POST | `/api/v1/music-studios/:studioId/preview-recording` | User |  |  |
| POST | `/api/v1/music-studios/:studioId/save-recording` | User |  | ✓ |
| POST | `/api/v1/music-studios/:studioId/start-recording` | User |  | ✓ |
| POST | `/api/v1/music-studios/:studioId/stop-recording` | User |  | ✓ |
| GET | `/api/v1/music-studios/:studioId/users` | User |  |  |
| POST | `/api/v1/music-studios/create` | User |  | ✓ |
| GET | `/api/v1/music-studios/joined` | User |  |  |
| GET | `/api/v1/music-studios/list` | User |  |  |
| GET | `/api/v1/music-studios/my-studios` | User |  |  |
| GET | `/api/v1/music-studios/names` | User |  |  |
| GET | `/api/v1/music/:id` | Optional |  |  |
| POST | `/api/v1/music/:id/like` | User |  |  |
| POST | `/api/v1/music/:id/play` | Optional |  |  |
| GET | `/api/v1/music/:id/stream` | Optional |  |  |
| POST | `/api/v1/music/create` | Optional | `any` |  |
| POST | `/api/v1/music/create-with-files` | Optional | `any` |  |
| POST | `/api/v1/music/create-with-json` | Optional |  |  |
| DELETE | `/api/v1/music/delete/:id` | CREATOR, ADMIN |  |  |
| GET | `/api/v1/music/liked` | User |  |  |
| GET | `/api/v1/music/list` | Optional |  |  |
| GET | `/api/v1/music/new-releases` | Optional |  |  |
| GET | `/api/v1/music/trending` | Optional |  |  |
| PATCH | `/api/v1/music/update/:id` | CREATOR, ADMIN |  |  |
| POST | `/api/v1/onboarding/complete` | User |  |  |
| POST | `/api/v1/onboarding/connect-google` | User |  |  |
| POST | `/api/v1/onboarding/discovery` | User |  |  |
| GET | `/api/v1/onboarding/status` | User |  |  |
| GET | `/api/v1/playlists/:id` | User |  |  |
| PATCH | `/api/v1/playlists/:id` | User |  | ✓ |
| POST | `/api/v1/playlists/:id/cover` | User | `cover` |  |
| POST | `/api/v1/playlists/:id/tracks` | User |  | ✓ |
| DELETE | `/api/v1/playlists/:id/tracks/:musicId` | User |  |  |
| POST | `/api/v1/playlists/create` | User |  | ✓ |
| DELETE | `/api/v1/playlists/delete/:id` | User |  |  |
| GET | `/api/v1/playlists/list` | User |  |  |
| PATCH | `/api/v1/playlists/update/:id` | User |  | ✓ |
| GET | `/api/v1/posts` | User |  |  |
| POST | `/api/v1/posts` | User |  |  |
| POST | `/api/v1/posts/:id/comment` | User |  |  |
| GET | `/api/v1/posts/:id/comments` | User |  |  |
| POST | `/api/v1/posts/:id/like` | User |  |  |
| GET | `/api/v1/posts/feed` | User |  |  |
| GET | `/api/v1/reports` | ADMIN, SUPER_ADMIN |  |  |
| POST | `/api/v1/reports` | User |  |  |
| PATCH | `/api/v1/reports/:id` | ADMIN, SUPER_ADMIN |  |  |
| POST | `/api/v1/room-messages` | User |  |  |
| GET | `/api/v1/room-messages/:chummeSubCategoryId` | User |  |  |
| DELETE | `/api/v1/room-messages/:id` | User |  |  |
| POST | `/api/v1/room-messages/:messageId/translate` | User |  |  |
| GET | `/api/v1/search` | Public |  |  |
| DELETE | `/api/v1/session-social-accounts/:platform` | User |  |  |
| POST | `/api/v1/session-social-accounts/link` | User |  |  |
| GET | `/api/v1/session-social-accounts/me` | User |  |  |
| GET | `/api/v1/social-discovery` | User |  |  |
| PUT | `/api/v1/social-discovery` | User |  |  |
| GET | `/api/v1/sports/fixtures` | User |  |  |
| GET | `/api/v1/sports/fixtures/:eventId/messages` | User |  |  |
| POST | `/api/v1/sports/fixtures/:eventId/messages` | User |  |  |
| GET | `/api/v1/sports/fixtures/:id` | User |  |  |
| GET | `/api/v1/sports/leagues` | User |  |  |
| GET | `/api/v1/sports/leagues/:leagueId/teams` | User |  |  |
| DELETE | `/api/v1/sports/messages/:messageId` | User |  |  |
| POST | `/api/v1/sports/messages/:messageId/translate` | User |  |  |
| GET | `/api/v1/system-assets` | Public |  |  |
| DELETE | `/api/v1/system-assets/:id` | User |  |  |
| PATCH | `/api/v1/system-assets/:id` | User |  |  |
| GET | `/api/v1/system-assets/:key` | Public |  |  |
| POST | `/api/v1/system-assets/upload` | User | `file` |  |
| POST | `/api/v1/system/cache/clear` | Public |  |  |
| POST | `/api/v1/user-chat/join/:chummeSubCategoryId` | User |  |  |
| DELETE | `/api/v1/user-chat/leave/:chummeSubCategoryId` | User |  |  |
| GET | `/api/v1/user-chat/members/:chummeSubCategoryId` | User |  |  |
| DELETE | `/api/v1/users/:id/block` | User |  |  |
| POST | `/api/v1/users/:id/block` | User |  |  |
| PATCH | `/api/v1/users/:id/status` | ADMIN |  | ✓ |
| POST | `/api/v1/users/admin` | ADMIN |  | ✓ |
| DELETE | `/api/v1/users/me` | User |  |  |
| GET | `/api/v1/users/me` | User |  |  |
| PATCH | `/api/v1/users/me` | User |  | ✓ |
| GET | `/api/v1/users/me/blocks` | User |  |  |
| GET | `/api/v1/youtube/channel-videos` | Public |  |  |
| GET | `/api/v1/youtube/playlist-videos` | Public |  |  |
| POST | `/api/v1/youtube/rooms/:roomId/refresh-live` | Public |  |  |
| GET | `/api/v1/youtube/search` | Public |  |  |
| GET | `/api/v1/youtube/video-details` | Public |  |  |
<!-- routes:end -->

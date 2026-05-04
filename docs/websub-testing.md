# 🚀 YouTube WebSub Testing Guide

This document outlines how to test and verify the real-time ingestion engine for YouTube videos.

## 1. Local Development Setup (ngrok)

YouTube's Hub needs a public URL to send notifications to. 

1.  **Start ngrok**:
    ```bash
    ngrok http 3002
    ```
2.  **Update `.env`**:
    Copy the `https` forwarding URL (e.g., `https://a1b2-c3d4.ngrok-free.app`) and update your `.env`:
    ```env
    WEBSUB_CALLBACK_URL=https://a1b2-c3d4.ngrok-free.app/api
    ```
3.  **Restart Server**:
    Ensure the server is running so it can respond to the verification handshake.

---

## 2. Manual Subscription Management

Use the provided management script to bypass the hourly scheduler.

### Subscribe a Channel
```bash
npx ts-node scripts/websub-manage.ts subscribe <channelId>
```
**Example**: `npx ts-node scripts/websub-manage.ts subscribe UC_x5XG1OV2P6uZZ5FSM9Ttw`

### Unsubscribe a Channel
```bash
npx ts-node scripts/websub-manage.ts unsubscribe <channelId>
```

---

## 3. Simulating a Notification (The "Bypass" Test)

You can test the ingestion pipeline logic without waiting for an actual YouTube upload by using the `/simulate` endpoint.

**Endpoint**: `POST /api/ingestion/websub/youtube/simulate`  
**Content-Type**: `text/xml`

### Sample XML Payload
```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/feeds/videos.xml" xmlns="http://www.w3.org/2005/Atom">
  <link rel="hub" href="https://pubsubhubbub.appspot.com"/>
  <link rel="self" href="https://www.youtube.com/xml/feeds/videos.xml?channel_id=UC_x5XG1OV2P6uZZ5FSM9Ttw"/>
  <title>YouTube video feed</title>
  <updated>2026-04-27T06:00:00+00:00</updated>
  <entry>
    <id>yt:video:dQw4w9WgXcQ</id>
    <yt:videoId>dQw4w9WgXcQ</yt:videoId>
    <yt:channelId>UC_x5XG1OV2P6uZZ5FSM9Ttw</yt:channelId>
    <title>Sample WebSub Video</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"/>
    <author>
      <name>Sample Channel</name>
      <uri>https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw</uri>
    </author>
    <published>2026-04-27T06:00:00+00:00</published>
    <updated>2026-04-27T06:00:00+00:00</updated>
  </entry>
</feed>
```

---

## 4. Verification Steps

1.  **Check Handshake**: In your server logs, look for:
    `[WebSubService] Handshake verified for channel: UC_x5XG1OV2P6uZZ5FSM9Ttw`
2.  **Check Database**: Query the `SocialIngestionTarget` table:
    ```sql
    SELECT "webSubState", "webSubSubscribedAt" FROM "SocialIngestionTarget" WHERE "externalHandle" = 'UC_x5XG1OV2P6uZZ5FSM9Ttw';
    ```
    It should show `SUBSCRIBED`.
3.  **Check Ingestion Queue**: After simulating a notification, check the logs for:
    `[WebSubService] Notification: Video "Sample WebSub Video" (dQw4w9WgXcQ)...`
    Followed by a metadata job being queued in RabbitMQ.

## 5. Troubleshooting

*   **Signature Verification Failed**: Ensure your `WEBSUB_SECRET` in `.env` matches the one used by the Hub. If testing via `/simulate`, you can omit the `x-hub-signature` header to bypass verification.
*   **404 Not Found**: Double check that `WEBSUB_CALLBACK_URL` in `.env` correctly points to your base API path (usually ending in `/api`).

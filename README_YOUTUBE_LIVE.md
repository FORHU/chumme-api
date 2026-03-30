# YouTube Real-Time Live Discovery System

A scalable, low-quota, push-based system to detect when YouTube channels go live. This solution replaces traditional polling with **WebSub (PubSubHubbub)** to provide near-instant "Live Now" notifications while minimizing YouTube Data API v3 quota consumption.

## 🚀 Key Features

-   **Zero-Quota Detection**: WebSub/PubSubHubbub uses free push notifications from Google's Hub.
-   **Intelligent Verification**: Verified via single `videos.list` calls (1 quota unit) to confirm `live` status and extract metadata.
-   **RabbitMQ Integration**: Asynchronous processing decouples webhook reception from API-heavy validation.
-   **Socket.io Delivery**: Pushes `SOCIAL_STREAM_LIVE` events to all connected clients instantly upon verification.
-   **Auto-Maintenance**: Background service automatically manages and renews channel subscriptions before leases expire.

## 🛠️ Setup & Configuration

### 1. Prerequisites
-   A public-facing URL (e.g., **ngrok** for local development).
-   YouTube Data API v3 Key.

### 2. Environment Variables (.env)
Add the following to your `chumme-api/.env`:
```env
# The public callback URL for WebSub (must be reachable by Google's Hub)
WEBSUB_CALLBACK_URL=https://<your-public-url>/api/v1/social/webhook/youtube
```

### 3. Running ngrok (Local Dev)
```powershell
ngrok http 3002
```
Update your `.env` with the generated `Forwarding` HTTPS URL.

---

## 📖 How to Use

### Subscribe a New Channel
To subscribe an existing target or a new channel manually, use the provided script:
```powershell
npx ts-node src/scripts/test-websub.ts <YOUTUBE_CHANNEL_ID>
```
*Wait for the verification challenge in the server logs (should happen within 5-10 seconds).*

### Listening for Live Events (Frontend)
Register a listener in your Socket.io client:
```javascript
socket.on("SOCIAL_STREAM_LIVE", (data) => {
  console.log("🔥 Stream started:", data.title);
  // data: { id, platform, videoId, title, url, artistName }
});
```

---

## 🏗️ Architecture

1.  **Webhook Controller**: Receives GET (verification) and POST (notification) requests from `pubsubhubbub.appspot.com`.
2.  **Ingestion Worker**: Triggered by the webhook. Verifies the `videoId` against the YouTube API to ensure it's a live broadcast.
3.  **Redis Storage**: Deduplicates notifications (ensures only one alert per video within a 24h window).
4.  **WebSub Service**: Manages the state and renewal of Hub subscriptions.
5.  **Scheduling Service**: Periodic loop (1h) that checks for expiring leases and triggers renewals.

## 🧹 Maintenance
The system is self-healing. Any active YouTube target in the `SocialIngestionTarget` database will be automatically subscribed/renewed by the `SchedulingService`.

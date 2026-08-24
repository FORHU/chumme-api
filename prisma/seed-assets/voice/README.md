# Voice note seed assets

Drop audio clips here and the chat seeder will attach them to seeded messages as
voice notes.

```
prisma/seed-assets/voice/
  hey-everyone.mp3
  quick-question.mp3
  singing-clip.mp3
```

Accepted extensions: `.mp3` `.m4a` `.aac` `.wav` `.ogg`

## What happens to them

For each clip, on `npm run db:seed:chat` (or `db:seed:globe`):

1. **Duration** is read with `ffprobe` — the real length, shown on the bubble.
2. **Waveform** is extracted with `ffmpeg`: decoded to mono 8kHz PCM, RMS per
   bucket, 32 bars normalised to 0..1. That's the shape drawn in the player.
3. **Uploaded to S3** under `seed/voice/<content-hash>.<ext>` in the bucket from
   `AWS_S3_BUCKET_NAME`, returning a CDN URL.
4. **Recorded as a `File` row** with `metaData: { duration, waveform }`, which
   messages reference via `RoomMessage.voiceMessageId`.

Both binaries ship inside `node_modules` (`ffmpeg-static`, `ffprobe-static`), so
nothing needs installing. If either is missing the seeder degrades gracefully —
estimated duration, synthetic waveform — rather than failing.

## Re-runs

The S3 key is a hash of the file's **contents**, so:

- Re-running with unchanged clips re-uploads nothing.
- Renaming a clip doesn't orphan its upload.
- Editing a clip lands on a new key, so no stale CDN cache.

## Tuning

| Variable | Default | Effect |
|---|---|---|
| `SEED_VOICE_RATIO` | `0.12` | Share of messages that become voice notes |

An empty folder is a no-op — the seeder just produces text-only chats.

## Note

Clips are shared across every seeded room, picked at random per message, so a
handful of files is enough. Five to ten of varying length reads best; all-similar
lengths make the pattern obvious.

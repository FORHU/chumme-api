import { PrismaClient } from "@prisma/client";
import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import S3Util from "../../src/utils/s3.util";

/**
 * Turns a folder of MP3s into reusable voice-note attachments for seeded chats.
 *
 * Drop files in `prisma/seed-assets/voice/`. Anything with an audio extension is
 * picked up; an empty or missing folder makes this a no-op, so the chat seeder
 * still runs normally without it.
 *
 * Each clip is probed for its real duration, has a real waveform extracted from
 * its audio, is uploaded to S3 once, and is recorded as a `File` row. Messages
 * then reference that row via `RoomMessage.voiceMessageId`.
 *
 * Uploads go to the bucket in AWS_S3_BUCKET_NAME under the `seed/voice/` prefix,
 * keyed by a hash of the file's contents — so re-running never re-uploads an
 * unchanged clip, and a changed clip lands on a new key instead of serving stale
 * bytes from a CDN cache.
 */

const VOICE_NAMESPACE = "7c2f5a91-3e8d-4b17-9a24-6d1f0e8c5b33";

/** Where to look for source audio, relative to the api package root. */
const ASSETS_DIR = path.join(__dirname, "..", "seed-assets", "voice");

const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".aac", ".wav", ".ogg"]);

/** Bars drawn by VoiceMessageBubble. Its own fallback array is 20 long. */
const WAVEFORM_BUCKETS = 32;

function uuidV5(name: string, namespace: string = VOICE_NAMESPACE): string {
  const nsHex = namespace.replace(/-/g, "");
  const nameBytes = new TextEncoder().encode(name);

  const input = new Uint8Array(16 + nameBytes.length);
  for (let i = 0; i < 16; i++) {
    input[i] = parseInt(nsHex.slice(i * 2, i * 2 + 2), 16);
  }
  input.set(nameBytes, 16);

  const digest = crypto.createHash("sha1").update(input).digest();
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = digest[i];
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/**
 * Resolve the bundled ffmpeg/ffprobe binaries.
 *
 * `ffmpeg-static` and `ffprobe-static` are already dependencies (the audio-merge
 * worker uses them), so nothing has to be installed on the machine or on PATH —
 * which is just as well, because neither is on PATH here.
 */
function resolveBinaries(): { ffmpeg: string | null; ffprobe: string | null } {
  let ffmpeg: string | null = null;
  let ffprobe: string | null = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("ffmpeg-static");
    ffmpeg = typeof mod === "string" ? mod : mod?.default ?? null;
  } catch {
    ffmpeg = null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("ffprobe-static");
    ffprobe = typeof mod === "string" ? mod : mod?.path ?? null;
  } catch {
    ffprobe = null;
  }

  return { ffmpeg, ffprobe };
}

/** Duration in seconds, or null when it can't be determined. */
function probeDuration(ffprobe: string | null, file: string): number | null {
  if (!ffprobe) return null;
  try {
    const out = execFileSync(
      ffprobe,
      ["-v", "quiet", "-print_format", "json", "-show_format", file],
      { maxBuffer: 1024 * 1024 },
    ).toString();
    const seconds = Number(JSON.parse(out)?.format?.duration);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  } catch {
    return null;
  }
}

/**
 * Extract a real waveform by decoding to mono 8kHz PCM and taking the RMS of
 * each bucket.
 *
 * RMS rather than peak: peak amplitude in a short bucket is dominated by
 * transients, which renders as a row of near-identical full-height bars. RMS
 * tracks perceived loudness and produces a shape that actually resembles the
 * speech in the clip.
 *
 * Values are normalised to 0..1 because VoiceMessageBubble multiplies each by
 * its 30px max bar height.
 */
function extractWaveform(ffmpeg: string | null, file: string): number[] | null {
  if (!ffmpeg) return null;
  try {
    const pcm = execFileSync(
      ffmpeg,
      ["-v", "quiet", "-i", file, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
      { maxBuffer: 256 * 1024 * 1024 },
    );

    const sampleCount = Math.floor(pcm.length / 2);
    if (sampleCount < WAVEFORM_BUCKETS) return null;

    const perBucket = Math.floor(sampleCount / WAVEFORM_BUCKETS);
    const buckets: number[] = [];

    for (let b = 0; b < WAVEFORM_BUCKETS; b++) {
      let sumSquares = 0;
      const start = b * perBucket;
      for (let i = 0; i < perBucket; i++) {
        const sample = pcm.readInt16LE((start + i) * 2) / 32768;
        sumSquares += sample * sample;
      }
      buckets.push(Math.sqrt(sumSquares / perBucket));
    }

    // Normalise against the loudest bucket so quiet recordings still fill the
    // widget instead of drawing as a flat line.
    const peak = Math.max(...buckets);
    if (peak <= 0) return null;

    return buckets.map((v) => Math.round(Math.min(1, (v / peak) * 0.95 + 0.05) * 100) / 100);
  } catch {
    return null;
  }
}

/** A pleasant fallback shape for when ffmpeg is unavailable. */
function syntheticWaveform(seed: string): number[] {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Taper the ends so it reads as an utterance rather than white noise.
  return Array.from({ length: WAVEFORM_BUCKETS }, (_, i) => {
    const envelope = Math.sin((Math.PI * (i + 0.5)) / WAVEFORM_BUCKETS);
    return Math.round(Math.max(0.08, envelope * (0.45 + rand() * 0.55)) * 100) / 100;
  });
}

export type VoiceClip = {
  fileId: string;
  /** Seconds — the client multiplies by 1000 for display. */
  duration: number;
  label: string;
};

const MIME_BY_EXT: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

/**
 * Ingest the assets folder and return clips ready to attach to messages.
 * Returns an empty array when there is nothing to ingest.
 */
export async function prepareVoiceClips(
  prisma: PrismaClient,
): Promise<VoiceClip[]> {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.log(
      `🔇 No voice assets folder — skipping voice notes. Drop MP3s in prisma/seed-assets/voice/ to enable.`,
    );
    return [];
  }

  const files = fs
    .readdirSync(ASSETS_DIR)
    .filter((f) => AUDIO_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort();

  if (files.length === 0) {
    console.log(`🔇 prisma/seed-assets/voice/ is empty — skipping voice notes.`);
    return [];
  }

  const { ffmpeg, ffprobe } = resolveBinaries();
  if (!ffprobe) {
    console.log("⚠️ ffprobe unavailable — falling back to estimated durations.");
  }
  if (!ffmpeg) {
    console.log("⚠️ ffmpeg unavailable — falling back to synthetic waveforms.");
  }

  const clips: VoiceClip[] = [];

  for (const name of files) {
    const fullPath = path.join(ASSETS_DIR, name);
    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(name).toLowerCase();

    // Content hash, not filename: renaming a clip shouldn't orphan its upload,
    // and editing one shouldn't quietly keep serving the old bytes.
    // Zero-copy view rather than the Buffer itself: @types/node types Buffer
    // with an ArrayBufferLike backing store that won't narrow to BinaryLike.
    const contentHash = crypto
      .createHash("sha256")
      .update(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength))
      .digest("hex")
      .slice(0, 16);

    const fileId = uuidV5(`voice:${contentHash}`);
    const key = `seed/voice/${contentHash}${ext}`;

    const existing = await prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, fileUrl: true, metaData: true },
    });

    if (existing?.fileUrl) {
      const meta = (existing.metaData ?? {}) as any;
      clips.push({
        fileId: existing.id,
        duration: Number(meta.duration) || 3,
        label: name,
      });
      console.log(`   ↻ ${name} (already uploaded)`);
      continue;
    }

    const duration =
      probeDuration(ffprobe, fullPath) ??
      // ~128kbps is the usual case for voice-grade MP3; only used when ffprobe
      // is missing, purely so the bubble shows something sane.
      Math.max(1, Math.round(buffer.length / 16000));

    const waveform =
      extractWaveform(ffmpeg, fullPath) ?? syntheticWaveform(contentHash);

    let fileUrl: string;
    try {
      fileUrl = await S3Util.uploadFileWithKey(
        buffer,
        key,
        MIME_BY_EXT[ext] ?? "audio/mpeg",
      );
    } catch (err: any) {
      console.error(`   ✗ ${name}: upload failed — ${err?.message ?? err}`);
      continue;
    }

    await prisma.file.upsert({
      where: { id: fileId },
      update: { fileUrl, metaData: { duration, waveform, seeded: true } },
      create: {
        id: fileId,
        filename: name,
        fileUrl,
        metaData: { duration, waveform, seeded: true },
      },
    });

    clips.push({ fileId, duration, label: name });
    console.log(
      `   ✓ ${name} — ${duration.toFixed(1)}s, ${waveform.length} bars → ${key}`,
    );
  }

  console.log(`🎤 Voice clips ready: ${clips.length}`);
  return clips;
}

/** Prefix every seeded clip is uploaded under. Scopes both listing and deletion. */
export const VOICE_KEY_PREFIX = "seed/voice/";

/**
 * Remove seeded voice notes: the S3 objects *and* the File rows pointing at them.
 *
 * Scoped by the `seed/voice/` key prefix, so uploads from real users — which go
 * to `uploads/` — are never touched.
 *
 * Messages referencing a clip have their `voiceMessageId` cleared first: the
 * column is a foreign key, so deleting the File out from under them would fail,
 * and this has to work whether or not the chat purge runs alongside it.
 */
export async function purgeSeededVoiceNotes(prisma: PrismaClient) {
  const files = await prisma.file.findMany({
    where: { fileUrl: { contains: VOICE_KEY_PREFIX } },
    select: { id: true },
  });

  if (files.length === 0) {
    console.log("🔇 No seeded voice notes to purge.");
    return;
  }

  const ids = files.map((f) => f.id);

  const detached = await prisma.roomMessage.updateMany({
    where: { voiceMessageId: { in: ids } },
    data: { voiceMessageId: null },
  });

  const removed = await prisma.file.deleteMany({ where: { id: { in: ids } } });

  let objects = 0;
  try {
    objects = await S3Util.deleteByPrefix(VOICE_KEY_PREFIX);
  } catch (err: any) {
    console.error(
      `⚠️ S3 cleanup failed (${err?.message ?? err}). DB rows are gone; objects under ${VOICE_KEY_PREFIX} may remain.`,
    );
  }

  console.log(
    `✅ Voice notes purged: ${removed.count} File rows, ${detached.count} messages detached, ${objects} S3 objects.`,
  );
}

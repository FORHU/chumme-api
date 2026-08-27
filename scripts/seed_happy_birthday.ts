import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import fs from 'fs';
import MusicLibrarySvc from '../src/services/music-library.service';
import MusicSvc from '../src/services/music.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TITLE = 'Happy Birthday to You';

async function main() {
  const filePath = String.raw`C:\Users\USER\Desktop\chumme\Happy Birthday Song.mp3`;

  console.log('Deleting previous Happy Birthday records...');
  // MusicSingerPart.musicId is optional with no onDelete cascade, so Prisma
  // defaults to SetNull — deleting the Music alone would leave orphaned part
  // rows behind on every re-run. Clear them explicitly first, along with the
  // MusicLibrary row, so re-seeding stays clean instead of accreting junk.
  const previous = await prisma.music.findMany({
    where: { title: TITLE },
    select: { id: true, musicFileId: true },
  });

  if (previous.length) {
    await prisma.musicSingerPart.deleteMany({
      where: { musicId: { in: previous.map(p => p.id) } },
    });
    await prisma.music.deleteMany({ where: { id: { in: previous.map(p => p.id) } } });
    await prisma.musicLibrary.deleteMany({
      where: { id: { in: previous.map(p => p.musicFileId).filter(Boolean) as string[] } },
    });
    console.log(`  removed ${previous.length} previous record(s) + parts + file rows`);
  }

  // LRC-style timings. Unlike the 500 Miles source these carry centiseconds
  // ([00:05.60]), so the parser below keeps the fractional part instead of
  // truncating to whole seconds.
  const rawLyrics = `[00:05.60]Happy Birthday to you
[00:08.70]Happy Birthday to you
[00:11.70]Happy Birthday, dear ____
[00:15.20]Happy Birthday to you

[00:18.00]Happy Birthday to you
[00:21.10]Happy Birthday to you
[00:24.10]Happy Birthday, dear ____
[00:29.60]Happy Birthday to you`;

  // Parse [MM:SS] / [MM:SS.CC] timestamps into Whisper-like segments
  const segments = [];
  let plainTextLyrics = "";
  let id = 0;

  /** [MM:SS] with an optional .CC / :CC fractional tail. */
  const STAMP = /^(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)/;

  /** Fractional seconds from a matched stamp; 2-digit frac is centiseconds. */
  const toSeconds = (m: RegExpMatchArray) => {
    const mins = parseInt(m[1], 10);
    const secs = parseInt(m[2], 10);
    const fracRaw = m[3];
    const frac = fracRaw ? parseInt(fracRaw, 10) / Math.pow(10, fracRaw.length) : 0;
    return mins * 60 + secs + frac;
  };

  const splits = rawLyrics.split('[').filter(x => x.trim().length > 0);
  for (let i = 0; i < splits.length; i++) {
    const split = splits[i];
    const match = split.match(STAMP);
    if (match) {
      const startSecs = toSeconds(match);
      const text = match[4].trim();

      // Skip the blank line between verses — it carries no lyric of its own.
      if (!text) continue;

      // Calculate end time using the next segment if available
      let endSecs = startSecs + 5;
      if (i + 1 < splits.length) {
        const nextMatch = splits[i + 1].match(STAMP);
        if (nextMatch) {
          endSecs = toSeconds(nextMatch);
        }
      }

      segments.push({
        id: id++,
        start: startSecs,
        end: endSecs,
        text: text,
      });
      plainTextLyrics += text + "\n";
    }
  }

  console.log(`Parsed ${segments.length} lyric segments (${segments[0]?.start}s -> ${segments[segments.length - 1]?.end}s)`);
  if (segments.length === 0) {
    throw new Error('No lyric segments parsed — check the timestamp format.');
  }

  console.log('Reading file from:', filePath);
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found! Please check the path.');
  }

  const buffer = fs.readFileSync(filePath);

  // `Music` has no metaData column — the transcription is read back off
  // MusicLibrary.metaData (music.service flattens musicFile.metaData to root,
  // then reads .transcription for lyrics + segment timings). Passing it only to
  // createMusic below would derive the singer parts and then throw the lyrics
  // away, leaving hasWordTiming=true with nothing to display, so it has to go in
  // on the upload as well.
  const transcription = {
    text: plainTextLyrics.trim(),
    segments: segments,
  };

  console.log('Uploading file to S3...');
  const fileRecord = await MusicLibrarySvc.uploadMusicFile(
    buffer,
    'happy_birthday.mp3',
    'audio/mpeg',
    { transcription },
    'KARAOKE'
  );

  console.log('File uploaded. DB Record ID:', fileRecord.id);

  // Get an admin or creator user to own the music
  const owner = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'CREATOR'] } }
  }) || await prisma.user.findFirst();

  if (!owner) throw new Error('No user found to own the music');

  console.log('Creating Music record in database...');
  const music = await MusicSvc.createMusic({
    title: TITLE,
    release_date: new Date(),
    isKaraoke: true,
    hasWordTiming: segments.length > 0, // We have line timings
    ownerId: owner.id,
    musicFileId: fileRecord.id,
    // Consumed transiently here to derive MusicSingerPart rows; not persisted.
    metaData: { transcription }
  });

  console.log('Success! Music created with ID:', music.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());

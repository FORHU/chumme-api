import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import fs from 'fs';
import MusicLibrarySvc from '../src/services/music-library.service';
import MusicSvc from '../src/services/music.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const filePath = String.raw`C:\Users\USER\Desktop\chumme\500 Miles Instrumental.mp3`;

  console.log('Deleting previous 500 Miles records...');
  await prisma.music.deleteMany({
    where: { title: '500 Miles (Peter, Paul and Mary)' }
  });
  
  const rawLyrics = `[00:19]If you miss the train I'm on, you will know that I am gone. [00:29]You can hear the whistle. [00:31]You can hear the whistle blow 100 miles. [00:38]100 Miles, 100 miles, 100 miles, 100 miles. [00:49]You can hear the whistle blow 100 miles. [00:58]Lord, I'm one. [01:01]Lord, I'm two. [01:03]Lord, I'm three. [01:06]Lord, I'm four. [01:08]Lord, I'm 500 miles from my home. [01:18]500 Miles, 500 miles, 500 miles, 500 miles. [01:25]Lord, I'm 500 miles from my home. [01:30]500 Miles from my home. [01:38]Not a shirt on my back, not a penny to my name. [01:48]Lord, I can't go home. [01:52]This a-way, this a-way, this a-way. [01:57]This a-way, this a-way, this a-way. [02:03]This-a-way, this-a-way, Lord, I can't go home. [02:12]This-a-way. [02:17]If you miss the train I'm on, you will know that I am gone. [02:27]You can hear the whistle blow 100 miles away.`;

  // Parse [MM:SS] timestamps into Whisper-like segments
  const segments = [];
  let plainTextLyrics = "";
  let id = 0;
  
  const splits = rawLyrics.split('[').filter(x => x.trim().length > 0);
  for (let i = 0; i < splits.length; i++) {
    const split = splits[i];
    const match = split.match(/^(\d{2}):(\d{2})\]\s*(.*)/);
    if (match) {
      const mins = parseInt(match[1]);
      const secs = parseInt(match[2]);
      const startSecs = mins * 60 + secs;
      const text = match[3].trim();
      
      // Calculate end time using the next segment if available
      let endSecs = startSecs + 5; 
      if (i + 1 < splits.length) {
        const nextMatch = splits[i + 1].match(/^(\d{2}):(\d{2})\]/);
        if (nextMatch) {
          const nextMins = parseInt(nextMatch[1]);
          const nextSecs = parseInt(nextMatch[2]);
          endSecs = nextMins * 60 + nextSecs;
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

  console.log('Reading file from:', filePath);
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found! Please check the path.');
  }
  
  const buffer = fs.readFileSync(filePath);

  console.log('Uploading file to S3...');
  const fileRecord = await MusicLibrarySvc.uploadMusicFile(
    buffer,
    '500_miles.mp3',
    'audio/mpeg',
    undefined,
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
    title: '500 Miles (Peter, Paul and Mary)',
    release_date: new Date(),
    isKaraoke: true,
    hasWordTiming: segments.length > 0, // We have line timings
    ownerId: owner.id,
    musicFileId: fileRecord.id,
    metaData: {
      transcription: { 
        text: plainTextLyrics.trim(),
        segments: segments 
      }
    }
  });

  console.log('Success! Music created with ID:', music.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());

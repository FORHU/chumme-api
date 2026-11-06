Voice notes for match-room fan chat (`npm run db:seed:sports:chat`).

Drop short clips here (.mp3 / .m4a / .aac / .wav / .ogg), a few seconds each:
crowd chants, fans cheering, someone shouting at the ref. Each is uploaded to S3
once under `seed/voice/` and reused across matches.

Empty folder → the seeder falls back to `../voice/`. No clips there either →
match chat is text only.

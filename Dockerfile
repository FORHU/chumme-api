FROM node:22-alpine

WORKDIR /app

# Install tzdata so the container supports timezones. ffmpeg brings ffprobe:
# ffprobe-static ships no linux/arm64 binary, and the box is arm64.
RUN apk add --no-cache tzdata ffmpeg

# Use Alpine's ffmpeg, not the npm ffmpeg-static binary: that one links glibc
# statically, can't resolve hostnames here, and so can't read the signed S3
# links that video trimming and posters work from (src/utils/media.utils.ts).
ENV FFMPEG_PATH=/usr/bin/ffmpeg FFPROBE_PATH=/usr/bin/ffprobe

# Set default timezone
ENV TZ=Asia/Manila

COPY package*.json tsconfig.json ./

RUN npm install 

COPY . .

RUN npx prisma generate

RUN npm run build

# Documentation only — Docker does not enforce this. Must match PORT in
# src/config.ts (3002), which is also what deploy/docker-compose.prod.yaml
# publishes on loopback and what deploy/nginx-chumme.conf proxies to.
EXPOSE 3002

# Invoked via `sh` rather than as an executable so a checkout that lost the
# exec bit (Windows, or a zip export) still boots.
CMD ["sh", "./scripts/start.sh"]
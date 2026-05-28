import MusicRepo from "../repositories/music.repository";
import CacheUtil from "../utils/cache.util";
import logger from "../utils/logger";

interface CreateMusicInput {
  title: string;
  duration?: number;
  bpm?: number;
  hasWordTiming?: boolean;
  release_date: Date;
  musicFileId?: string;
  musicAlbumId?: string;
  musicArtistId?: string;
  playlistId?: string;
  order?: number;
  metaData?: any;
  isKaraoke?: boolean;
  vocalRolesCount?: number;
  ownerId?: string;
}
export default class MusicSvc {
  /**
   * Remove audio file extensions from a string
   */
  private static stripAudioExtension(name: string): string {
    return name.replace(/\.(mp3|wav|flac|aac|ogg|m4a)$/i, "");
  }

  /**
   * Create music
   */
  static async createMusic(data: CreateMusicInput) {
    // Strip extension from title if present
    if (data.title) {
      data.title = this.stripAudioExtension(data.title);
    }

    if (!data.musicFileId) {
      throw new Error("musicFileId is required");
    }

    // --- PHRASING EXTRACTION ---
    // If it's karaoke and has metadata (Whisper format), try to extract segments
    const parts: any[] = [];
    if (data.isKaraoke && data.metaData?.transcription?.segments) {
      const segments = data.metaData.transcription.segments;
      const rolesCount = data.vocalRolesCount || 2;

      // Grouping logic: Support both \n\n and \r\n\r\n
      const content = data.metaData.transcription.content || "";
      const sections = content.split(/\n\n|\r\n\r\n/);

      if (sections.length > 1) {
        let currentLine = 0;
        sections.forEach((section: string, index: number) => {
          const trimmedSection = section.trim();
          if (!trimmedSection) return;

          // Header detection: [Verse], Chorus:, (Bridge), etc.
          const headerMatch = trimmedSection.match(
            /^\[([\w\s]+)\]|^([\w\s]+):|^\(([\w\s]+)\)/,
          );
          const partName = headerMatch
            ? (headerMatch[1] || headerMatch[2] || headerMatch[3]).trim()
            : `Part ${index + 1}`;

          // Strip header from content to get actual lines
          const linesOnly = headerMatch
            ? trimmedSection.replace(headerMatch[0], "").trim()
            : trimmedSection;

          const lines = linesOnly
            .split(/\n|\r\n/)
            .filter((l: string) => l.trim());

          if (lines.length === 0) return;

          const startLine = currentLine;
          const endLine = currentLine + lines.length - 1;

          // Auto-assign Role 0 to Chorus or sections named "All"
          const isCollective = /chorus|all/i.test(partName);
          const vocalRoleIndex = isCollective ? 0 : (index % rolesCount) + 1;

          parts.push({
            name: partName,
            startLine,
            endLine: Math.min(endLine, segments.length - 1),
            vocalRoleIndex,
            order: index + 1,
          });
          currentLine += lines.length;
        });
      }

      // Fallback: If no parts were created, use the "Group of 4" rule
      if (parts.length === 0) {
        for (let i = 0; i < segments.length; i += 4) {
          parts.push({
            name: `Segment ${Math.floor(i / 4) + 1}`,
            startLine: i,
            endLine: Math.min(i + 3, segments.length - 1),
            vocalRoleIndex: (Math.floor(i / 4) % rolesCount) + 1,
            order: Math.floor(i / 4) + 1,
          });
        }
      }
    }

    const music = await MusicRepo.create({
      ...data,
      parts: parts.length > 0 ? parts : undefined,
    });

    // Invalidate caches
    if (data.musicAlbumId) {
      await CacheUtil.del(`musics:album:${data.musicAlbumId}`);
    }
    if (data.musicArtistId) {
      await CacheUtil.del(`musics:artist:${data.musicArtistId}`);
    }
    await CacheUtil.delByPattern("musics:*");
    return this.enrichMusicData(music);
  }

  static async getMusicById(id: string) {
    const cachedKey = `music:${id}`;
    const cached = await CacheUtil.get(cachedKey);
    if (cached) {
      logger.info(`[MusicSvc] Cache HIT for getMusicById: ${id}`);
      return this.enrichMusicData(cached);
    }

    logger.info(`[MusicSvc] Cache MISS for getMusicById: ${id}`);
    const music = await MusicRepo.findById(id);
    if (!music) throw new Error("Music not found");

    await CacheUtil.set(cachedKey, music);
    return this.enrichMusicData(music);
  }

  static async getMusics(params: {
    page?: number;
    limit?: number;
    albumId?: string;
    artistId?: string;
    playlistId?: string;
    isKaraoke?: boolean;
    search?: string;
    genre?: string;
    sort?: "popular" | "newest" | "oldest";
  }) {
    const cachedKey = `musics:${JSON.stringify(params)}`;
    const cached = await CacheUtil.get(cachedKey);
    if (cached) {
      logger.info(`[MusicSvc] Cache HIT for getMusics: ${cachedKey}`);
      if (cached && cached.data) {
        cached.data = cached.data.map((m: any) => this.enrichMusicData(m));
      }
      return cached;
    }

    logger.info(`[MusicSvc] Cache MISS for getMusics: ${cachedKey}`);
    const result = await MusicRepo.findAll(params);
    result.data = result.data.map((m: any) => this.enrichMusicData(m));
    await CacheUtil.set(cachedKey, result);
    return result;
  }

  static async getMusicByTitle(title: string) {
    const music = await MusicRepo.findByTitle(title);
    return this.enrichMusicData(music);
  }

  /**
   * Check if a music record already exists based on title, artist, album, and type.
   * This allows same-titled songs to exist for different scenarios.
   */
  static async checkDuplicate(params: {
    title: string;
    musicArtistId?: string | null;
    musicAlbumId?: string | null;
    isKaraoke: boolean;
  }) {
    const cleanTitle = this.stripAudioExtension(params.title);
    return await MusicRepo.findDuplicate({
      ...params,
      title: cleanTitle,
    });
  }

  static async updateMusic(id: string, data: any) {
    const music = await MusicRepo.update(id, data);
    await CacheUtil.del(`music:${id}`);
    await CacheUtil.delByPattern("musics:*");
    return this.enrichMusicData(music);
  }

  static async getNewReleases(params: { limit?: number; cursor?: string }) {
    const limit = Math.min(params.limit ?? 20, 50);
    const result = await MusicRepo.findNewReleases({
      limit,
      cursor: params.cursor,
    });
    result.items = result.items.map((m: any) => this.enrichMusicData(m));
    return result;
  }

  static async getTrending(limit = 20) {
    const cacheKey = `music:trending:${limit}`;
    const cached = await CacheUtil.get(cacheKey);
    if (cached) {
      logger.info(`[MusicSvc] Cache HIT for getTrending`);
      return (cached as any[]).map((m: any) => this.enrichMusicData(m));
    }

    const tracks = await MusicRepo.findTrending(Math.min(limit, 50));
    const enriched = tracks.map((m: any) => this.enrichMusicData(m));
    await CacheUtil.set(cacheKey, enriched, 300); // 5-min TTL for trending
    return enriched;
  }

  static async recordPlay(id: string) {
    const music = await MusicRepo.incrementPlayCount(id);
    return { id: music.id, playCount: music.playCount };
  }

  static async getStreamInfo(id: string) {
    const music = await this.getMusicById(id);
    if (!music) throw new Error("Music not found");

    const fileUrl = music.musicFile?.fileUrl;
    if (!fileUrl) throw new Error("Audio file not found for this track");

    return {
      hlsUrl: fileUrl, // Direct CDN URL; replace with HLS manifest when pipeline is enabled
      duration: music.duration ?? null,
    };
  }

  static async deleteMusic(id: string) {
    const music = await MusicRepo.delete(id);
    await CacheUtil.del(`music:${id}`);
    await CacheUtil.delByPattern("musics:*");
    return music;
  }

  /**
   * Enriches music data for frontend consumption.
   * - Flattens musicFile.metaData to root level (safely)
   * - Extracts lyrics field
   * - Populates parts from metaData segments if empty
   * - Ensures backward compatibility for old metadata structures
   */
  private static enrichMusicData(music: any) {
    if (!music) return music;

    const fileMeta = music.musicFile?.metaData as any;
    if (fileMeta) {
      // 1. Backward Compatibility: Ensure .transcription exists if it's in .songInfo
      if (fileMeta.songInfo?.transcription && !fileMeta.transcription) {
        fileMeta.transcription = fileMeta.songInfo.transcription;
      }

      // 2. Safe Flattening: Don't overwrite core Music fields with metadata
      const coreFields = [
        "id",
        "title",
        "duration",
        "bpm",
        "release_date",
        "isKaraoke",
      ];
      Object.keys(fileMeta).forEach((key) => {
        if (!coreFields.includes(key)) {
          music[key] = fileMeta[key];
        }
      });

      // 2.5 Ensure imageUrl is at the top level (optimized for frontend list response)
      if (fileMeta.imageUrl && !music.imageUrl) {
        music.imageUrl = fileMeta.imageUrl;
      }

      // 3. Extract songInfo specifically if it exists
      const songInfo = fileMeta.songInfo || fileMeta;
      const transcription = fileMeta.transcription || songInfo?.transcription;

      if (transcription) {
        // 4. Ensure lyrics field is present
        music.lyrics =
          music.lyrics || transcription.content || transcription.text || "";

        // 5. Fallback for Parts: If parts are empty, populate from segments
        if (
          (!music.parts || music.parts.length === 0) &&
          (transcription.segments || transcription.words)
        ) {
          const rawSegments = transcription.segments || transcription.words;
          music.parts = rawSegments.map((seg: any, idx: number) => ({
            id: `v_${seg.id || idx}`,
            name: `Segment ${(seg.id || idx) + 1}`,
            startLine: seg.id || idx,
            endLine: seg.id || idx,
            text: seg.text || seg.word || "",
            start: seg.start,
            end: seg.end,
            startTime: seg.start,
            endTime: seg.end,
            vocalRoleIndex: 1,
            order: seg.id || idx,
          }));
        }
      }
    }

    return music;
  }
}

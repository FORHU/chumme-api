import MusicRepo from "../repositories/music.repository";
import CacheUtil from "../utils/cache.util";

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
}

interface FileUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
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
      // Grouping logic: Support both \n\n and \r\n\r\n
      const content = data.metaData.transcription.content || "";
      const sections = content.split(/\n\n|\r\n\r\n/);

      if (sections.length > 1) {
        let currentLine = 0;
        sections.forEach((section: string, index: number) => {
          const trimmedSection = section.trim();
          if (!trimmedSection) return;
          const lines = trimmedSection
            .split(/\n|\r\n/)
            .filter((l: string) => l.trim());
          const startLine = currentLine;
          const endLine = currentLine + lines.length - 1;

          parts.push({
            name: `Part ${index + 1}`,
            startLine,
            endLine: Math.min(endLine, segments.length - 1),
            vocalRoleIndex: (index % 2) + 1,
            order: index + 1,
          });
          currentLine += lines.length;
        });
      }

      // If no parts were created (even if sections > 1 reached but failed to produce parts), use fallback
      if (parts.length === 0) {
        for (let i = 0; i < segments.length; i += 4) {
          parts.push({
            name: `Segment ${Math.floor(i / 4) + 1}`,
            startLine: i,
            endLine: Math.min(i + 3, segments.length - 1),
            vocalRoleIndex: (Math.floor(i / 4) % 2) + 1,
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
    await CacheUtil.del("musics:all");

    return music;
  }

  static async getMusicById(id: string) {
    const cachedKey = `music:${id}`;
    const cached = await CacheUtil.get(cachedKey);
    if (cached) return cached;

    const music = await MusicRepo.findById(id);
    if (!music) throw new Error("Music not found");

    await CacheUtil.set(cachedKey, music);
    return music;
  }

  static async getMusics(params: {
    albumId?: string;
    artistId?: string;
    playlistId?: string;
    isKaraoke?: boolean;
  }) {
    const cachedKey = `musics:${JSON.stringify(params)}`;
    const cached = await CacheUtil.get(cachedKey);
    if (cached) return cached;

    const musics = await MusicRepo.findAll(params);
    await CacheUtil.set(cachedKey, musics);
    return musics;
  }

  static async getMusicByTitle(title: string) {
    const music = await MusicRepo.findByTitle(title);
    return music;
  }

  static async updateMusic(id: string, data: any) {
    const music = await MusicRepo.update(id, data);
    await CacheUtil.del(`music:${id}`);
    await CacheUtil.del("musics:all");
    if (music.musicArtistId) {
      await CacheUtil.del(`musics:artist:${music.musicArtistId}`);
    }
    return music;
  }

  static async deleteMusic(id: string) {
    const music = await MusicRepo.delete(id);
    await CacheUtil.del(`music:${id}`);
    await CacheUtil.del("musics:all");
    return music;
  }
}

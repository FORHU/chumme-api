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
  vocalRolesCount?: number;
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
          let partName = headerMatch
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

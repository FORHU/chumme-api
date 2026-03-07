import MusicRepo from "../repositories/music.repository";
import MusicStudioCacheSvc from "./music-studio-cache.service";
import RelayManager from "../utils/relay-manager";
import { MusicStudioRole } from "@prisma/client";
import MusicStudioRepo from "../repositories/music-studio.repository";

/**
 * Music Queue Service
 * Handles business logic for queuing, playing, and managing songs in a studio.
 * Uses MusicStudioCacheSvc for Redis operations.
 */
export default class MusicQueueSvc {
  /**
   * Add a song to the queue
   * - Validates music exists in the database
   * - Formats queue item with title, artist, cover image
   * - Stores in Redis via MusicStudioCacheSvc (max 10 songs)
   * @returns Updated queue array
   */
  static async addToQueue(
    studioId: string,
    musicId: string,
    userId: string,
    userName: string,
  ) {
    const music = await MusicRepo.findById(musicId);
    if (!music) throw new Error("Music not found");

    const queueItem = {
      musicId: music.id,
      title: music.title,
      artist: music.musicArtist?.name || "Unknown Artist",
      cover: music.musicArtist?.imageUrl || null,
      queuedBy: userId,
      queuedByName: userName,
    };

    await MusicStudioCacheSvc.addMusicToQueue(studioId, queueItem);
    return await MusicStudioCacheSvc.getMusicQueue(studioId);
  }

  /**
   * Remove a song from the queue by index
   * @returns Updated queue array
   */
  static async removeFromQueue(studioId: string, index: number) {
    await MusicStudioCacheSvc.removeMusicFromQueue(studioId, index);
    return await MusicStudioCacheSvc.getMusicQueue(studioId);
  }

  /**
   * Play a specific song immediately (Change Active Song)
   * Side Effects:
   * - Sets studio state to IDLE
   * - Resets lyric index to 0
   * - Sets active song in Redis
   * - Loads phrasing if karaoke song
   * - Assigns initial singer for RELAYSINGING mode
   * @returns Data for 'song_changed' socket event
   */
  static async playNow(studioId: string, musicId: string, userId: string) {
    const music = await MusicRepo.findById(musicId);
    if (!music) throw new Error("Music not found");

    // Reset Studio State
    const promises: Promise<any>[] = [
      MusicStudioCacheSvc.setStudioState(studioId, "IDLE"),
      MusicStudioCacheSvc.setLyricIndex(studioId, 0),
      MusicStudioCacheSvc.setActiveSong(studioId, musicId),
    ];

    if (music.isKaraoke && music.parts) {
      promises.push(MusicStudioCacheSvc.setPhrasing(studioId, music.parts));
    }
    const backingTrackUrl = music.musicFile.fileUrl;
    await Promise.all(promises);

    // Initial Singer Assignment
    const { nextSingerId, targetRoleIndex } =
      await RelayManager.getNextAutoSingerId(studioId, 0);

    if (targetRoleIndex !== null) {
      await MusicStudioCacheSvc.setCurrentRoleIndex(studioId, targetRoleIndex);
    }

    if (nextSingerId) {
      await MusicStudioCacheSvc.setCurrentSinger(studioId, nextSingerId);
    } else {
      const existingSinger =
        await MusicStudioCacheSvc.getCurrentSinger(studioId);
      if (!existingSinger) {
        const members = await MusicStudioCacheSvc.getMembers(studioId);
        const firstEligible = members.find(
          (m) =>
            m.role === MusicStudioRole.SINGER ||
            m.role === MusicStudioRole.PRODUCER,
        );
        if (firstEligible) {
          await MusicStudioCacheSvc.setCurrentSinger(
            studioId,
            firstEligible.userId,
          );
        }
      }
    }

    const finalSinger = await MusicStudioCacheSvc.getCurrentSinger(studioId);
    let finalSingerName = null;
    if (finalSinger) {
      const singerInfo = await MusicStudioCacheSvc.getMember(
        studioId,
        finalSinger,
      );
      finalSingerName = singerInfo?.name || "Unknown";
    }

    console.log(`[MusicStudio] Song changed to ${musicId} in ${studioId}`);

    return {
      studioId,
      musicId,
      backingTrackUrl,
      currentSinger: finalSinger || null,
      currentSingerName: finalSingerName,
      currentRoleIndex: targetRoleIndex,
      selectedBy: userId,
    };
  }

  /**
   * Play the next song from the queue
   * - Pops (removes) the first song from the queue
   * - Calls playNow to activate it
   * @returns { songChangedData, newQueue }
   * @throws Error if queue is empty
   */
  static async playNext(studioId: string, userId: string) {
    const nextItem = await MusicStudioCacheSvc.popNextMusic(studioId);
    if (!nextItem) {
      throw new Error("Queue is empty");
    }

    // Play the popped song
    const songChangedData = await this.playNow(
      studioId,
      nextItem.musicId,
      userId,
    );
    const newQueue = await MusicStudioCacheSvc.getMusicQueue(studioId);

    return {
      songChangedData,
      newQueue,
    };
  }
}

import MusicRepo from "../repositories/music.repository";
import MusicStudioCacheSvc from "./music-studio-cache.service";
import RelayManager from "../utils/relay-manager";
import { StudioRole } from "@prisma/client";
import MusicStudioRepo from "../repositories/music-studio.repository";

export default class MusicQueueSvc {
  /**
   * Add a song to the queue
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
   */
  static async removeFromQueue(studioId: string, index: number) {
    await MusicStudioCacheSvc.removeMusicFromQueue(studioId, index);
    return await MusicStudioCacheSvc.getMusicQueue(studioId);
  }

  /**
   * Play a specific song immediately (Change Active Song)
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
          (m) => m.role === StudioRole.SINGER || m.role === StudioRole.PRODUCER,
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
      currentSinger: finalSinger || null,
      currentSingerName: finalSingerName,
      currentRoleIndex: targetRoleIndex,
      selectedBy: userId,
    };
  }

  /**
   * Play the next song from the queue
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

import * as scheduleRepo from "../repositories/social-ingestion-schedule.repository";
import CacheUtil from "../utils/cache.util";

const CACHE_KEY_PREFIX = "ingestion:schedules:";

export const createSchedule = async (data: {
  socialIngestionTargetId: string;
  mode?: string;
  exactTime?: string | null;
  intervalHours?: number | null;
  isActive?: boolean;
}) => {
  const schedule = await scheduleRepo.create(data);
  // ClearCache for this target
  await CacheUtil.del(`${CACHE_KEY_PREFIX}${data.socialIngestionTargetId}`);
  return schedule;
};

export const updateSchedule = async (
  id: string,
  data: {
    mode?: string;
    exactTime?: string | null;
    intervalHours?: number | null;
    isActive?: boolean;
  },
) => {
  const schedule = await scheduleRepo.update(id, data);
  // Find target id to clear cache
  const fullSchedule = await scheduleRepo.findById(id);
  if (fullSchedule) {
    await CacheUtil.del(
      `${CACHE_KEY_PREFIX}${fullSchedule.socialIngestionTargetId}`,
    );
  }
  return schedule;
};

export const getScheduleById = async (id: string) => {
  return scheduleRepo.findById(id);
};

export const getSchedulesByTargetId = async (targetId: string) => {
  const cacheKey = `${CACHE_KEY_PREFIX}${targetId}`;

  const cached = await CacheUtil.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const schedules = await scheduleRepo.findByTargetId(targetId);
  await CacheUtil.set(cacheKey, JSON.stringify(schedules), 1800); // 30 mins Cache
  return schedules;
};

export const deleteSchedule = async (id: string) => {
  const fullSchedule = await scheduleRepo.findById(id);
  const result = await scheduleRepo.deleteSchedule(id);

  if (fullSchedule) {
    await CacheUtil.del(
      `${CACHE_KEY_PREFIX}${fullSchedule.socialIngestionTargetId}`,
    );
  }

  return result;
};

export const getAllActiveSchedules = async () => {
  return scheduleRepo.getAllActiveSchedules();
};

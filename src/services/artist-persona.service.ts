import * as artistPersonaRepo from "../repositories/artist-persona.repository";
import CacheUtil from "../utils/cache.util";
import { BadRequestError } from "../utils/error.util";



export const getAllPersonas = async () => {
  const cacheKey = "personas:all";

  const cached = await CacheUtil.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const personas = await artistPersonaRepo.getAll();

  await CacheUtil.set(cacheKey, JSON.stringify(personas), 3600);

  return personas;
};

export const createPersona = async (data: {
  name?: string | null;
  voiceKey?: string | null;
  persona?: string | null;
  audioPathId?: string | null;
  videoPathId?: string | null;
  imagePathId?: string | null;
}) => {
  // Check for existing personas with same media IDs if provided
  if (data.audioPathId) {
    const existing = await artistPersonaRepo.findByAudioPathId(
      data.audioPathId,
    );
    if (existing) throw new BadRequestError("Audio file already assigned");
  }
  if (data.videoPathId) {
    const existing = await artistPersonaRepo.findByVideoPathId(
      data.videoPathId,
    );
    if (existing) throw new BadRequestError("Video file already assigned");
  }
  if (data.imagePathId) {
    const existing = await artistPersonaRepo.findByImagePathId(
      data.imagePathId,
    );
    if (existing) throw new BadRequestError("Image file already assigned");
  }

  const persona = await artistPersonaRepo.create({
    name: data.name ?? "Unknown", // Fallback if name is missing
    voiceKey: data.voiceKey ?? "default", // Fallback if voiceKey is missing
    persona: data.persona ?? "default-persona",
    audioPathId: data.audioPathId ?? null,
    videoPathId: data.videoPathId ?? null,
    imagePathId: data.imagePathId ?? null,
  });

  return persona;
};

export const updatePersona = async (
  id: string,
  data: {
    name?: string | null;
    voiceKey?: string | null;
    persona?: string | null;
    audioPathId?: string | null;
    videoPathId?: string | null;
    imagePathId?: string | null;
  },
) => {
  if (data.audioPathId) {
    const existing = await artistPersonaRepo.findByAudioPathId(
      data.audioPathId,
    );
    if (existing && existing.id !== id)
      throw new BadRequestError("Audio file already assigned");
  }
  if (data.videoPathId) {
    const existing = await artistPersonaRepo.findByVideoPathId(
      data.videoPathId,
    );
    if (existing && existing.id !== id)
      throw new BadRequestError("Video file already assigned");
  }
  if (data.imagePathId) {
    const existing = await artistPersonaRepo.findByImagePathId(
      data.imagePathId,
    );
    if (existing && existing.id !== id)
      throw new BadRequestError("Image file already assigned");
  }

  const persona = await artistPersonaRepo.update(id, {
    name: data.name,
    voiceKey: data.voiceKey,
    persona: data.persona,
    audioPathId: data.audioPathId,
    videoPathId: data.videoPathId,
    imagePathId: data.imagePathId,
  });

  return persona;
};

export const deletePersona = async (id: string) => {
  const result = await artistPersonaRepo.deletePersona(id);

  return result;
};

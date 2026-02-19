import * as artistPersonaRepo from "../repositories/artist-persona.repository";
import CacheUtil from "../utils/cache.util";
import { BadRequestError } from "../utils/error.util";

export const getPersonaByArtistId = async (artistId: string) => {
  const cacheKey = `artist:${artistId}:persona`;

  const cached = await CacheUtil.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const persona = await artistPersonaRepo.findByArtistId(artistId);

  if (persona) {
    await CacheUtil.set(cacheKey, JSON.stringify(persona), 3600);
  }
  return persona;
};

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
  artistId?: string | null;
  personaVoiceId: string;
  personaFileId: string;
}) => {
  const existingPersona = await artistPersonaRepo.findByPersonaFileId(
    data.personaFileId,
  );
  if (existingPersona) {
    throw new BadRequestError("File is already assigned to another persona");
  }

  const persona = await artistPersonaRepo.create(data);

  if (data.artistId) {
    await CacheUtil.del(`artist:${data.artistId}:persona`);
  }
  return persona;
};

export const updatePersona = async (
  id: string,
  data: {
    artistId?: string | null;
    personaVoiceId?: string;
    personaFileId?: string;
  },
) => {
  if (data.personaFileId) {
    const existingPersona = await artistPersonaRepo.findByPersonaFileId(
      data.personaFileId,
    );
    if (existingPersona && existingPersona.id !== id) {
      throw new BadRequestError("File is already assigned to another persona");
    }
  }

  const persona = await artistPersonaRepo.update(id, data);

  if (persona.artistId) {
    await CacheUtil.del(`artist:${persona.artistId}:persona`);
  }
  return persona;
};

export const deletePersona = async (id: string, artistId?: string) => {
  const result = await artistPersonaRepo.deletePersona(id);

  if (artistId) {
    await CacheUtil.del(`artist:${artistId}:persona`);
  }
  return result;
};

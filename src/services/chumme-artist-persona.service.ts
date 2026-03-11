import * as chummeArtistPersonaRepo from "../repositories/chumme-artist-persona.repository";
import CacheUtil from "../utils/cache.util";
import { BadRequestError } from "../utils/error.util";

export const getPersonaByArtistId = async (chummeArtistId: string) => {
  const cacheKey = `artist:${chummeArtistId}:persona`;

  const cached = await CacheUtil.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const persona = await chummeArtistPersonaRepo.findByArtistId(chummeArtistId);

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

  const personas = await chummeArtistPersonaRepo.getAll();

  await CacheUtil.set(cacheKey, JSON.stringify(personas), 3600);

  return personas;
};

export const createPersona = async (data: {
  chummeArtistId?: string | null;
  personaVoiceId: string;
  personaFileId: string;
}) => {
  const existingPersona = await chummeArtistPersonaRepo.findByPersonaFileId(
    data.personaFileId,
  );
  if (existingPersona) {
    throw new BadRequestError("File is already assigned to another persona");
  }

  const persona = await chummeArtistPersonaRepo.create(data);

  if (data.chummeArtistId) {
    await CacheUtil.del(`artist:${data.chummeArtistId}:persona`);
  }
  return persona;
};

export const updatePersona = async (
  id: string,
  data: {
    chummeArtistId?: string | null;
    personaVoiceId?: string;
    personaFileId?: string;
  },
) => {
  if (data.personaFileId) {
    const existingPersona = await chummeArtistPersonaRepo.findByPersonaFileId(
      data.personaFileId,
    );
    if (existingPersona && existingPersona.id !== id) {
      throw new BadRequestError("File is already assigned to another persona");
    }
  }

  const persona = await chummeArtistPersonaRepo.update(id, data);

  if (persona.chummeArtistId) {
    await CacheUtil.del(`artist:${persona.chummeArtistId}:persona`);
  }
  return persona;
};

export const deletePersona = async (id: string, chummeArtistId?: string) => {
  const result = await chummeArtistPersonaRepo.deletePersona(id);

  if (chummeArtistId) {
    await CacheUtil.del(`artist:${chummeArtistId}:persona`);
  }
  return result;
};

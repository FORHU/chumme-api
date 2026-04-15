import { Request, Response } from "express";
import Joi from "joi";
import PlaylistSvc from "../services/playlist.service";

export default class PlaylistCtrl {
  static async createPlaylist(req: Request, res: Response) {
    const schema = Joi.object({
      name: Joi.string().required(),
      description: Joi.string().required(),
      imageUrl: Joi.string().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const playlist = await PlaylistSvc.createPlaylist(value);
      return res.status(201).json(playlist);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  static async getPlaylistById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const playlist = await PlaylistSvc.getPlaylistById(id);
      return res.json(playlist);
    } catch (error: any) {
      return res.status(404).json({ message: error.message || error });
    }
  }

  static async getAllPlaylists(req: Request, res: Response) {
    try {
      const playlists = await PlaylistSvc.getAllPlaylists();
      return res.json(playlists);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  static async updatePlaylist(req: Request, res: Response) {
    const { id } = req.params;
    const schema = Joi.object({
      name: Joi.string(),
      description: Joi.string(),
      imageUrl: Joi.string(),
    }).min(1);

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const playlist = await PlaylistSvc.updatePlaylist(id, value);
      return res.json(playlist);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  static async deletePlaylist(req: Request, res: Response) {
    const { id } = req.params;
    try {
      await PlaylistSvc.deletePlaylist(id);
      return res.json({ message: "Playlist deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /** PATCH /v1/playlists/:id — update name, description, coverImageUrl, isPublic, or reorder tracks */
  static async patchPlaylist(req: Request, res: Response) {
    const { id } = req.params;

    const schema = Joi.object({
      name: Joi.string(),
      description: Joi.string(),
      imageUrl: Joi.string(),
      coverImageUrl: Joi.string(),
      isPublic: Joi.boolean(),
      trackOrder: Joi.array()
        .items(
          Joi.object({
            musicId: Joi.string().uuid().required(),
            order: Joi.number().integer().min(0).required(),
          }),
        )
        .optional(),
    }).min(1);

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const { trackOrder, ...fields } = value;

      // Update scalar fields if any were provided
      if (Object.keys(fields).length > 0) {
        await PlaylistSvc.updatePlaylist(id, fields);
      }

      // Reorder tracks if provided
      if (trackOrder && trackOrder.length > 0) {
        await PlaylistSvc.reorderTracks(id, trackOrder);
      }

      const updated = await PlaylistSvc.getPlaylistById(id);
      return res.json({ data: updated });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  /** POST /v1/playlists/:id/tracks — add a track */
  static async addTrack(req: Request, res: Response) {
    const { id } = req.params;

    const schema = Joi.object({
      musicId: Joi.string().uuid().required(),
      order: Joi.number().integer().min(0).default(0),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const track = await PlaylistSvc.addTrack(id, value.musicId, value.order);
      return res.status(201).json({ message: "Track added", data: track });
    } catch (error: any) {
      const status = error.message === "Track already in playlist" ? 409 : 500;
      return res.status(status).json({ message: error.message || error });
    }
  }

  /** DELETE /v1/playlists/:id/tracks/:musicId — remove a track */
  static async removeTrack(req: Request, res: Response) {
    const { id, musicId } = req.params;
    try {
      await PlaylistSvc.removeTrack(id, musicId);
      return res.json({ message: "Track removed" });
    } catch (error: any) {
      const status = error.message === "Track not in playlist" ? 404 : 500;
      return res.status(status).json({ message: error.message || error });
    }
  }
}

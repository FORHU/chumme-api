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
}

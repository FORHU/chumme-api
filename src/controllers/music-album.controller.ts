import { Request, Response } from "express";
import Joi from "joi";
import MusicAlbumSvc from "../services/music-album.service";

export default class MusicAlbumCtrl {
  static async createAlbum(req: Request, res: Response) {
    const schema = Joi.object({
      album: Joi.string().required(),
      genre: Joi.string().required(),
      language: Joi.string().required(),
      musicArtistId: Joi.string().uuid().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const album = await MusicAlbumSvc.createAlbum(value);
      return res.status(201).json(album);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  static async getAlbumById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const album = await MusicAlbumSvc.getAlbumById(id);
      return res.json(album);
    } catch (error: any) {
      return res.status(404).json({ message: error.message || error });
    }
  }

  static async getAllAlbums(req: Request, res: Response) {
    const { artistId, genre, language } = req.query as any;
    try {
      const albums = await MusicAlbumSvc.getAllAlbums({
        artistId,
        genre,
        language,
      });
      return res.json(albums);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  static async updateAlbum(req: Request, res: Response) {
    const { id } = req.params;
    const schema = Joi.object({
      album: Joi.string(),
      genre: Joi.string(),
      language: Joi.string(),
      musicArtistId: Joi.string().uuid(),
    }).min(1);

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
      const album = await MusicAlbumSvc.updateAlbum(id, value);
      return res.json(album);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }

  static async deleteAlbum(req: Request, res: Response) {
    const { id } = req.params;
    try {
      await MusicAlbumSvc.deleteAlbum(id);
      return res.json({ message: "Music album deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || error });
    }
  }
}

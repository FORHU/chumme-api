import { Request, Response } from "express";
import Joi from "joi";
import MessageTranslationSvc, {
  MessageTranslationError,
  TranslatableRoom,
} from "../services/message-translation.service";
import {
  languageName,
  normalizeLanguageCode,
} from "../utils/translation/translate-text.util";

const paramsSchema = Joi.object({
  messageId: Joi.string().uuid().required(),
});

const bodySchema = Joi.object({
  // A BCP-47 tag as the device reports it: "en", "en-US", "zh-Hant-TW", "fil".
  targetLanguage: Joi.string()
    .trim()
    .max(35)
    .pattern(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
    .required(),
});

/** Returns the normalised code, or null when no one has a name for it. */
const resolveTargetLanguage = (tag: string): string | null => {
  try {
    const code = normalizeLanguageCode(tag);
    return languageName(code) ? code : null;
  } catch {
    return null; // RangeError: well-formed by the regex, but not a real tag
  }
};

const handle =
  (room: TranslatableRoom) => async (req: Request, res: Response) => {
    try {
      const params = paramsSchema.validate(req.params, { allowUnknown: true });
      if (params.error) {
        return res
          .status(400)
          .json({ success: false, message: params.error.message });
      }
      const body = bodySchema.validate(req.body);
      if (body.error) {
        return res
          .status(400)
          .json({ success: false, message: body.error.message });
      }

      const targetLanguage = resolveTargetLanguage(body.value.targetLanguage);
      if (!targetLanguage) {
        return res
          .status(400)
          .json({ success: false, message: "Unsupported target language" });
      }

      const data = await MessageTranslationSvc.translate({
        room,
        messageId: params.value.messageId,
        userId: req.user.id,
        targetLanguage,
      });

      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      if (error instanceof MessageTranslationError) {
        return res
          .status(error.status)
          .json({ success: false, message: error.message });
      }
      console.error(
        `[MessageTranslationCtrl] ${room} translate failed:`,
        error,
      );
      return res
        .status(500)
        .json({ success: false, message: "Failed to translate message" });
    }
  };

export default class MessageTranslationCtrl {
  static translateCircleMessage = handle("circle");
  static translateSportMessage = handle("sport");
}

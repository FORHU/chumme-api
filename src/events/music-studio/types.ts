import { Socket, Server } from "socket.io";
import { StudioRole } from "@prisma/client";

export interface AuthenticatedSocket extends Socket {
  user?: any;
}

export interface CreateStudioPayload {
  name: string;
  keyName?: string;
  note?: string;
  maxMembers?: number;
}

export interface JoinStudioPayload {
  studioId: string;
  keyName?: string;
  role?: StudioRole;
}

export interface StudioActionPayload {
  studioId: string;
}

export interface UpdateRolePayload {
  studioId: string;
  targetUserId: string;
  role: StudioRole;
}

export interface RequestUploadUrlPayload {
  studioId: string;
  filename: string;
  mimetype: string;
}

export interface SaveRecordingPayload {
  studioId: string;
  musicId: string;
  fileKey?: string; // S3 key for pre-uploaded file
  filename?: string;
  mimetype?: string;
  audioData?: Buffer | ArrayBuffer; // Support both for flexibility
}

export type SocketHandler = (io: Server, socket: AuthenticatedSocket) => void;

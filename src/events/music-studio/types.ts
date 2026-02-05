import { Socket, Server } from "socket.io";
import { StudioRole, StudioType, RelayMode } from "@prisma/client";

export interface AuthenticatedSocket extends Socket {
  user?: any;
}

export interface CreateStudioPayload {
  name: string;
  studioType: StudioType;
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

export interface PassMicrophonePayload {
  studioId: string;
  targetUserId: string | null; // null to clear mic
}

export interface SetRelayModePayload {
  studioId: string;
  mode: RelayMode;
  interval?: number;
}

export interface UpdateVocalRolePayload {
  studioId: string;
  userId: string;
  vocalRoleIndex: number;
}

export type SocketHandler = (io: Server, socket: AuthenticatedSocket) => void;

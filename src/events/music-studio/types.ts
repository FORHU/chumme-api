import { Socket, Server } from "socket.io";
import {
  MusicStudioRole,
  MusicStudioType,
  MusicRelayMode,
} from "@prisma/client";

export interface AuthenticatedSocket extends Socket {
  user?: any;
}

export interface CreateStudioPayload {
  name: string;
  studioType: MusicStudioType;
  keyPassword?: string;
  note?: string;
  maxMembers?: number;
}

export interface JoinStudioPayload {
  studioId: string;
  keyPassword?: string;
  role?: MusicStudioRole;
}

export interface StudioActionPayload {
  studioId: string;
}

export interface UpdateRolePayload {
  studioId: string;
  targetUserId: string;
  role: MusicStudioRole;
}

export interface RequestUploadUrlPayload {
  studioId: string;
  filename: string;
  mimetype: string;
}

export interface SaveRecordingPayload {
  studioId: string;
  musicId: string;
  metaData?: any;
  performanceMapping?: {
    startLine: number;
    endLine: number;
    singerId: string;
    vocalRoleIndex?: number;
  }[];
}

export interface PassMicrophonePayload {
  studioId: string;
  targetUserId: string | null; // null to clear mic
}

export interface SetRelayModePayload {
  studioId: string;
  mode: MusicRelayMode;
  interval?: number;
}

export interface UpdateVocalRolePayload {
  studioId: string;
  userId: string;
  vocalRoleIndex: number;
}

export type SocketHandler = (io: Server, socket: AuthenticatedSocket) => void;

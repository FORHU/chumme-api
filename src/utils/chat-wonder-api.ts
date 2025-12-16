import axios from "axios";
import { CHAT_WONDER_API_URL } from "../config";
import { ExternalServiceError } from "./error.util";


export async function getSessionId(){
    const { data } = await axios.get(`${CHAT_WONDER_API_URL}/session-id`)
    return data;
}

type TSendChatPayload = {
  user_input: string
  user_history_select: string
  session_id: string
}

export async function chatWonderSendChat(payload: TSendChatPayload) {
  try {
    const { data } = await axios.post(
      `${CHAT_WONDER_API_URL}/chat`,
      payload
    );
    return data?.response || "";
  } catch (err: any) {
    throw new ExternalServiceError(
      err.response?.data?.message || err?.data?.message ||
      err?.message ||
      "Chat Wonder service error"
    );
  }
}

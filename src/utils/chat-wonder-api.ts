import axios from "axios";
import { CHAT_WONDER_API_URL } from "../config";


export async function getSessionId(){
    const { data } = await axios.get(`${CHAT_WONDER_API_URL}/session-id`)
    return data;
}

type TSendChatPayload = {
  user_input: string
  user_history_select: string
  session_id: string
}

export async function sendChat(payload: TSendChatPayload){
    const { data } = await axios.post(`${CHAT_WONDER_API_URL}/chat`,
        payload 
       )
    return data;
}
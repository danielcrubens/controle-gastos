/**
 * Recorte mínimo do payload do Telegram — apenas os campos que o backend usa.
 * (O Update completo do Bot API é enorme; validar tudo com class-validator seria ruído.)
 */
export interface TelegramVoice {
  file_id: string;
  duration: number;
  mime_type?: string;
}

export interface TelegramMessage {
  message_id: number;
  /** Unix seconds — referência para "hoje"/"ontem" no parser. */
  date?: number;
  text?: string;
  voice?: TelegramVoice;
  from?: {
    id: number;
    username?: string;
    first_name?: string;
  };
  chat: {
    id: number;
    first_name?: string;
  };
}

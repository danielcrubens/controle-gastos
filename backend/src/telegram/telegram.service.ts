import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { getAppConfig } from '../config/configuration.js';

/** Limite prático para áudio inline no Gemini e para o getFile do Telegram. */
const MAX_VOICE_BYTES = 15 * 1024 * 1024;

export class VoiceTooLargeError extends Error {
  constructor() {
    super('Áudio maior que 15MB');
    this.name = 'VoiceTooLargeError';
  }
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly bot: Telegraf;
  private readonly webhookSecret: string;
  private readonly appBaseUrl: string;

  constructor(configService: ConfigService) {
    const config = getAppConfig(configService);
    this.bot = new Telegraf(config.telegram.botToken);
    this.webhookSecret = config.telegram.webhookSecret;
    this.appBaseUrl = config.appBaseUrl;
  }

  get webhookUrl(): string {
    return `${this.appBaseUrl}/telegram/webhook`;
  }

  /** Registra o webhook com secret_token — chamado no boot quando TELEGRAM_SET_WEBHOOK=true. */
  async registerWebhook(): Promise<void> {
    await this.bot.telegram.setWebhook(this.webhookUrl, {
      secret_token: this.webhookSecret,
      allowed_updates: ['message'],
    });
    this.logger.log(
      JSON.stringify({ event: 'webhook_registered', url: this.webhookUrl }),
    );
  }

  /**
   * Envia a mensagem tentando Markdown legado (formato usado pelo n8n); se o
   * Telegram rejeitar a formatação (texto do usuário com "_", "*" soltos),
   * reenvia em texto puro para não perder a resposta.
   */
  async reply(chatId: number, text: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
      });
    } catch (firstError) {
      try {
        await this.bot.telegram.sendMessage(chatId, text);
      } catch (error) {
        this.logger.error(
          JSON.stringify({
            event: 'telegram_send_failed',
            chat_id: chatId,
            error: error instanceof Error ? error.message : String(error),
            first_error:
              firstError instanceof Error
                ? firstError.message
                : String(firstError),
          }),
        );
      }
    }
  }

  async downloadVoice(fileId: string): Promise<Buffer> {
    const fileLink = await this.bot.telegram.getFileLink(fileId);
    const response = await fetch(fileLink);

    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (declaredSize > MAX_VOICE_BYTES) throw new VoiceTooLargeError();
    if (!response.ok)
      throw new Error(`Download da voice falhou com HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_VOICE_BYTES) throw new VoiceTooLargeError();
    return buffer;
  }
}

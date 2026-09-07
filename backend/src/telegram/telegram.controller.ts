import { Body, Controller, Headers, Logger, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { getAppConfig } from '../config/configuration.js';
import { UpdateRouterService } from './update-router.service.js';

@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly router: UpdateRouterService,
    configService: ConfigService,
  ) {
    this.webhookSecret = getAppConfig(configService).telegram.webhookSecret;
  }

  /**
   * Webhook do Telegram. Valida o secret_token e responde 200 NA HORA:
   * o processamento (Gemini + Notion) roda async — o Telegram reenvia updates
   * quando o webhook demora/trava, o que duplicaria despesas.
   */
  @Post('webhook')
  webhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() update: unknown,
    @Res() res: Response,
  ): void {
    if (!secret || secret !== this.webhookSecret) {
      this.logger.warn(JSON.stringify({ event: 'webhook_secret_mismatch' }));
      res.status(401).send('Unauthorized');
      return;
    }

    res.status(200).send('OK');

    void this.router.handle(update).catch((error) => {
      // handle() já engole erros; isto é a última linha de defesa.
      this.logger.error(
        JSON.stringify({
          event: 'update_processing_crashed',
          error: String(error),
        }),
      );
    });
  }
}

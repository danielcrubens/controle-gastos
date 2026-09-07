import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { NotionAuthWebhookDto } from './dto/notion-auth-webhook.dto.js';

/**
 * Substitui o webhook `notion-auth` do n8n: recebe os tokens OAuth do Notion
 * gerados no onboarding do front (que aponta N8N_WEBHOOK_URL para cá).
 */
@Controller('webhooks')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('notion-auth')
  @HttpCode(201)
  async notionAuth(
    @Body() dto: NotionAuthWebhookDto,
  ): Promise<{ success: boolean }> {
    await this.authService.registerNotionConnection(dto);
    return { success: true };
  }
}

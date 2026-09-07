import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRecord } from '../auth/auth.types.js';
import { AuthService } from '../auth/auth.service.js';
import { NotionConnectionError } from '../notion/notion.errors.js';
import { ReportsService } from '../reports/reports.service.js';
import { getAppConfig } from '../config/configuration.js';
import { TelegramService } from './telegram.service.js';
import { TelegramMessage } from './telegram.types.js';
import { VoiceExpenseService } from './voice-expense.service.js';

@Injectable()
export class UpdateRouterService {
  private readonly logger = new Logger(UpdateRouterService.name);
  private readonly siteUrl: string;
  private readonly discordWebhookUrl?: string;

  constructor(
    private readonly telegram: TelegramService,
    private readonly authService: AuthService,
    private readonly reports: ReportsService,
    private readonly voiceExpense: VoiceExpenseService,
    configService: ConfigService,
  ) {
    const config = getAppConfig(configService);
    this.siteUrl = config.siteUrl;
    this.discordWebhookUrl = config.discordWebhookUrl;
  }

  /**
   * Ponto único de roteamento de updates. Nunca lança: qualquer erro não
   * tratado vira log estruturado + mensagem de erro no chat do usuário.
   */
  async handle(update: unknown): Promise<void> {
    const message = this.extractMessage(update);
    if (!message) return;

    const chatId = message.chat.id;
    try {
      const text = message.text?.trim();
      if (text?.startsWith('/')) {
        await this.handleCommand(message, text);
      } else if (message.voice) {
        await this.handleVoiceMessage(message);
      }
      // Texto sem comando e sem voz: ignorado (paridade com o n8n).
    } catch (error) {
      if (error instanceof NotionConnectionError) {
        await this.telegram.reply(chatId, this.reconnectMessage());
        return;
      }
      this.logger.error(
        JSON.stringify({
          event: 'update_failed',
          chat_id: chatId,
          telegram_id: message.from?.id,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      await this.telegram.reply(
        chatId,
        '❌ Ops! Tive um problema agora. Tente novamente em instantes.',
      );
    }
  }

  private extractMessage(update: unknown): TelegramMessage | undefined {
    const message = (update as { message?: TelegramMessage } | null)?.message;
    if (!message || typeof message.chat?.id !== 'number') return undefined;
    return message;
  }

  private async handleCommand(
    message: TelegramMessage,
    text: string,
  ): Promise<void> {
    const [command, ...rest] = text.split(/\s+/);
    const argument = rest.join(' ');

    switch (command) {
      case '/start':
        return this.handleStart(message, argument);
      case '/resumo':
        return this.handleSummary(message, 'current');
      case '/mes_anterior':
        return this.handleSummary(message, 'previous');
      case '/regra':
        // Não exige conta (paridade com o n8n): cálculo puro sobre o valor informado.
        return this.telegram.reply(
          message.chat.id,
          this.reports.budgetRuleMessage(argument),
        );
      case '/cancelar':
        return this.handleCancel(message);
      default:
        return; // comando desconhecido: silêncio
    }
  }

  private async handleStart(
    message: TelegramMessage,
    code: string,
  ): Promise<void> {
    const chatId = message.chat.id;
    const telegramId = message.from?.id;
    if (!telegramId) return;

    const user = code
      ? await this.authService.findPendingConnection(code)
      : null;
    if (!user) {
      this.logger.warn(
        JSON.stringify({
          event: 'invalid_connection_code',
          telegram_id: telegramId,
          code,
        }),
      );
      await this.telegram.reply(
        chatId,
        '❌ Código inválido ou já usado. Acesse o site para gerar um novo.',
      );
      return;
    }

    await this.authService.connectTelegram(
      user,
      telegramId,
      message.from?.username,
    );
    const firstName = message.from?.first_name ?? 'tudo certo';
    await this.telegram.reply(
      chatId,
      `Olá, *${firstName}*, você está conectado!\nEnvie áudios com suas despesas:`,
    );
  }

  private async handleSummary(
    message: TelegramMessage,
    period: 'current' | 'previous',
  ): Promise<void> {
    const user = await this.requireUser(message);
    if (!user) return;

    const summary = await this.reports.monthlySummaryMessage(user, period);
    await this.telegram.reply(message.chat.id, summary);
  }

  private async handleCancel(message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id;
    const telegramId = message.from?.id;
    if (!telegramId) return;

    const user = await this.authService.findConnectedAnyState(telegramId);
    if (!user) {
      await this.telegram.reply(chatId, this.notRegisteredMessage());
      return;
    }

    if (!user.is_active) {
      await this.telegram.reply(
        chatId,
        `⚠️ Sua conta já foi cancelada anteriormente. Para se cadastrar novamente, acesse: ${this.siteUrl}`,
      );
      return;
    }

    await this.authService.deactivate(user);
    await this.notifyCancellation(message, user);
    await this.telegram.reply(
      chatId,
      '✅ Conta cancelada com sucesso!\nObrigado por utilizar nosso serviço.',
    );
  }

  private async handleVoiceMessage(message: TelegramMessage): Promise<void> {
    const user = await this.requireUser(message);
    if (!user) return;
    await this.voiceExpense.handleVoice(user, message);
  }

  /** Usuário conectado e ativo; responde com a mensagem de cadastro se não estiver. */
  private async requireUser(
    message: TelegramMessage,
  ): Promise<UserRecord | null> {
    const telegramId = message.from?.id;
    if (!telegramId) return null;

    const user = await this.authService.findConnectedUser(telegramId);
    if (!user) {
      await this.telegram.reply(message.chat.id, this.notRegisteredMessage());
      return null;
    }
    return user;
  }

  /** Notificação opcional de cancelamento (o n8n avisava um canal do Discord). */
  private async notifyCancellation(
    message: TelegramMessage,
    user: UserRecord,
  ): Promise<void> {
    if (!this.discordWebhookUrl) return;
    try {
      const username = user.telegram_username
        ? `@${user.telegram_username}`
        : '—';
      await fetch(this.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content:
            `🚨 Solicitação de Cancelamento\n\n` +
            `**Nome:** ${message.chat.first_name ?? message.from?.first_name ?? '—'}\n` +
            `**Username:** ${username}\n` +
            `**ID:** ${user.telegram_id}`,
        }),
      });
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'discord_notification_failed',
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  private notRegisteredMessage(): string {
    return `⚠️ Cadastre-se primeiro em: *${this.siteUrl}*`;
  }

  private reconnectMessage(): string {
    return `⚠️ Não consegui acessar seu Notion. Reconecte sua conta em: ${this.siteUrl}`;
  }
}

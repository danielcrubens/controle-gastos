import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRecord } from '../auth/auth.types.js';
import {
  dateFromUnixSeconds,
  formatBRL,
  formatDateBR,
} from '../common/format.js';
import { getAppConfig } from '../config/configuration.js';
import {
  ExpenseParserService,
  ExpenseParserUnavailableError,
} from '../expense-parser/expense-parser.service.js';
import { ExpenseValidationError } from '../expense-parser/expense-parser.validation.js';
import { ParsedExpense } from '../expense-parser/expense-parser.types.js';
import { NotionConnectionError } from '../notion/notion.errors.js';
import { NotionService } from '../notion/notion.service.js';
import { TelegramService, VoiceTooLargeError } from './telegram.service.js';
import { TelegramMessage } from './telegram.types.js';

const MAX_VOICE_DURATION_SECONDS = 120;

@Injectable()
export class VoiceExpenseService {
  private readonly logger = new Logger(VoiceExpenseService.name);
  private readonly siteUrl: string;
  private readonly timezone: string;

  constructor(
    private readonly telegram: TelegramService,
    private readonly parser: ExpenseParserService,
    private readonly notion: NotionService,
    configService: ConfigService,
  ) {
    const config = getAppConfig(configService);
    this.siteUrl = config.siteUrl;
    this.timezone = config.timezone;
  }

  /** Fluxo completo: download → Gemini → validação → Notion → confirmação. */
  async handleVoice(user: UserRecord, message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id;
    const voice = message.voice!;

    try {
      if (voice.duration > MAX_VOICE_DURATION_SECONDS) {
        await this.telegram.reply(
          chatId,
          `⚠️ Áudio muito longo (máximo: 2 minutos). Resuma a despesa em um áudio mais curto.`,
        );
        return;
      }

      let audio: Buffer;
      try {
        audio = await this.telegram.downloadVoice(voice.file_id);
      } catch (error) {
        if (error instanceof VoiceTooLargeError) {
          await this.telegram.reply(
            chatId,
            '⚠️ O áudio está grande demais para processar. Mande um áudio mais curto.',
          );
          return;
        }
        throw error;
      }

      const referenceDate = dateFromUnixSeconds(
        message.date ?? Math.floor(Date.now() / 1000),
        this.timezone,
      );

      let expense: ParsedExpense;
      try {
        expense = await this.parser.parseExpense(
          audio,
          voice.mime_type ?? 'audio/ogg',
          referenceDate,
        );
      } catch (error) {
        if (error instanceof ExpenseValidationError) {
          await this.telegram.reply(
            chatId,
            error.reason === 'missing_value'
              ? '⚠️ Não consegui identificar o valor da despesa. Mande o áudio de novo falando o valor (ex.: "almoço vinte reais").'
              : '❌ Não entendi a despesa. Tente descrever o que você comprou e quanto custou.',
          );
          return;
        }
        if (error instanceof ExpenseParserUnavailableError) {
          await this.telegram.reply(
            chatId,
            '❌ O serviço de interpretação está indisponível agora. Tente novamente em instantes.',
          );
          return;
        }
        throw error;
      }

      try {
        await this.notion.createExpense(user, expense);
      } catch (error) {
        if (error instanceof NotionConnectionError) {
          await this.telegram.reply(
            chatId,
            `⚠️ Não consegui acessar seu Notion. Reconecte sua conta em: ${this.siteUrl}`,
          );
          return;
        }
        throw error; // NotionWriteError e afins → mensagem genérica abaixo
      }

      await this.telegram.reply(chatId, this.confirmationMessage(expense));
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'voice_flow_failed',
          user_id: user.id,
          chat_id: chatId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      await this.telegram.reply(
        chatId,
        '❌ Não consegui registrar sua despesa agora. Tente novamente em instantes.',
      );
    }
  }

  private confirmationMessage(expense: ParsedExpense): string {
    return (
      '✅ *Despesa registrada com sucesso!*\n\n' +
      `📝 *Descrição:* ${expense.descricao}\n` +
      `🏷️ *Categoria:* ${expense.categoria}\n` +
      `📅 *Data:* ${formatDateBR(expense.data)}\n` +
      `💰 *Valor:* ${formatBRL(expense.valor)}`
    );
  }
}

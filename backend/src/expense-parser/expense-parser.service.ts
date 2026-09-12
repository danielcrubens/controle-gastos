import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiError, GoogleGenAI, Type } from '@google/genai';
import { EXPENSE_CATEGORIES } from '../common/categories.js';
import { getAppConfig } from '../config/configuration.js';
import {
  ExpenseValidationError,
  parseAndValidateExpense,
} from './expense-parser.validation.js';
import { ParsedExpense } from './expense-parser.types.js';

/** O Gemini falhou por motivo externo (indisponibilidade, quota, timeout). */
export class ExpenseParserUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpenseParserUnavailableError';
  }
}

const GEMINI_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout após ${ms}ms`)),
      ms,
    );
    timer.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Erros transitórios do Google: sobrecarga (5xx, ex. 503 UNAVAILABLE) e rate limit (429). */
export function isRetryableGeminiError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 429 || error.status >= 500)
  );
}

const GEMINI_MAX_ATTEMPTS = 3;
const GEMINI_RETRY_BASE_DELAY_MS = 1500;

interface RetryOptions {
  /** Sobrescreve o critério de "vale nova tentativa" (uso em testes). */
  isRetryable?: (error: unknown) => boolean;
  /** Sobrescreve a espera entre tentativas (uso em testes). */
  sleep?: (ms: number) => Promise<void>;
  /** Observa cada nova tentativa (log de `gemini_retry` no serviço). */
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
}

/**
 * Repete a chamada em falhas transitórias do Google (429/5xx) com backoff
 * exponencial curto (1,5s, 3s). Outros erros e a última tentativa repassam
 * como estão — quem mapeia para a mensagem do bot é o fluxo de voz.
 */
export async function withRetry<T>(
  call: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const isRetryable = options.isRetryable ?? isRetryableGeminiError;
  const pause = options.sleep ?? sleep;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await call();
    } catch (error) {
      if (attempt >= GEMINI_MAX_ATTEMPTS || !isRetryable(error)) {
        throw error;
      }
      const delayMs = GEMINI_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      options.onRetry?.(attempt, delayMs, error);
      await pause(delayMs);
    }
  }
}

@Injectable()
export class ExpenseParserService {
  private readonly logger = new Logger(ExpenseParserService.name);
  private readonly genai: GoogleGenAI;
  private readonly model: string;

  constructor(configService: ConfigService) {
    const config = getAppConfig(configService);
    this.genai = new GoogleGenAI({ apiKey: config.gemini.apiKey });
    this.model = config.gemini.model;
  }

  /**
   * Transcrição + extração em UMA chamada: o áudio (.ogg do Telegram) vai
   * inline e o responseSchema força o JSON estruturado.
   */
  async parseExpense(
    audio: Buffer,
    mimeType: string,
    referenceDateISO: string,
  ): Promise<ParsedExpense> {
    const prompt = `Você é um extrator de dados financeiros. Ouça o áudio, em português do Brasil, descrevendo um gasto, e extraia os dados no schema JSON definido.

Regras:
- Interprete valores falados naturalmente: "vinte e cinco reais" = 25.00, "cinquenta conto" = 50.00, "R$ 23,50" = 23.50.
- descricao: resuma a despesa em 2 a 5 palavras (ex.: "almoço restaurante", "corte de cabelo").
- categoria: escolha UMA das opções do schema. Na dúvida, use "Outros".
- data: data da despesa em YYYY-MM-DD. "hoje" = ${referenceDateISO}; "ontem" = um dia antes. Sem data explícita, use ${referenceDateISO}.
- valor: apenas o número mencionado, com ponto como separador decimal. Se não houver valor, retorne null.
- Se houver mais de uma despesa no áudio, extraia apenas a primeira.
- Nunca invente informações que não estejam no áudio.`;

    try {
      const response = await withRetry(() =>
        withTimeout(
          this.genai.models.generateContent({
            model: this.model,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType, data: audio.toString('base64') } },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  descricao: { type: Type.STRING },
                  categoria: {
                    type: Type.STRING,
                    enum: [...EXPENSE_CATEGORIES],
                  },
                  data: { type: Type.STRING },
                  valor: { type: Type.NUMBER, nullable: true },
                },
                required: ['descricao', 'categoria', 'data', 'valor'],
              },
            },
          }),
          GEMINI_TIMEOUT_MS,
        ),
        {
          onRetry: (attempt, delayMs, error) => {
            this.logger.warn(
              JSON.stringify({
                event: 'gemini_retry',
                attempt,
                delay_ms: delayMs,
                status: error instanceof ApiError ? error.status : undefined,
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          },
        },
      );

      const raw = response.text ?? '';
      if (!raw.trim()) {
        throw new ExpenseValidationError(
          'unparseable',
          'Resposta vazia do Gemini',
        );
      }

      const expense = parseAndValidateExpense(raw, referenceDateISO);
      this.logger.log(
        JSON.stringify({
          event: 'expense_parsed',
          model: this.model,
          categoria: expense.categoria,
          valor: expense.valor,
          audio_bytes: audio.byteLength,
        }),
      );
      return expense;
    } catch (error) {
      // Falha de regra de negócio (JSON inválido / sem valor) repassa como está:
      // quem mapeia para a mensagem do bot é o fluxo de voz.
      if (error instanceof ExpenseValidationError) {
        this.logger.warn(
          JSON.stringify({
            event: 'expense_validation_failed',
            reason: error.reason,
            detail: error.message,
          }),
        );
        throw error;
      }

      this.logger.error(
        JSON.stringify({
          event: 'gemini_call_failed',
          model: this.model,
          audio_bytes: audio.byteLength,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      throw new ExpenseParserUnavailableError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

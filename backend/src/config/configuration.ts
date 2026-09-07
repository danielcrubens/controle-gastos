import { registerAs } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';

export interface AppConfig {
  port: number;
  /** URL pública deste backend — usada no setWebhook do Telegram. */
  appBaseUrl: string;
  /** Site de onboarding exibido nas mensagens do bot. */
  siteUrl: string;
  /** Fuso usado para "hoje", limites de mês e formatação de datas. */
  timezone: string;
  telegram: {
    botToken: string;
    webhookSecret: string;
    setWebhook: boolean;
  };
  gemini: {
    apiKey: string;
    model: string;
  };
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  /** Opcional: notificação de cancelamento (paridade com o n8n). */
  discordWebhookUrl?: string;
}

export default registerAs('app', (): AppConfig => ({
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  appBaseUrl: process.env.APP_BASE_URL!.replace(/\/+$/, ''),
  siteUrl: process.env.SITE_URL ?? 'https://faleiepronto.com.br',
  timezone: process.env.TZ ?? 'America/Sao_Paulo',
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET!,
    setWebhook: process.env.TELEGRAM_SET_WEBHOOK === 'true',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  },
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
}));

export function getAppConfig(configService: ConfigService): AppConfig {
  return configService.getOrThrow<AppConfig>('app');
}

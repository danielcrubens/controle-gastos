import { Length } from 'class-validator';

/**
 * Contrato enviado pelo front de onboarding no callback do OAuth do Notion
 * (front/server/api/notion/callback.ts → POST BACKEND_WEBHOOK_URL, agora este backend).
 */
export class NotionAuthWebhookDto {
  @Length(4, 64)
  connection_code!: string;

  @Length(1, 512)
  notion_access_token!: string;

  @Length(1, 64)
  notion_database_id!: string;
}

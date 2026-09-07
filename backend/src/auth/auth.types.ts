/** Linha da tabela `users` no Supabase (ver supabase/migrations/0001_create_users.sql). */
export interface UserRecord {
  id: string;
  connection_code: string;
  notion_access_token: string | null;
  notion_database_id: string | null;
  telegram_id: number | null;
  telegram_username: string | null;
  telegram_connected: boolean;
  is_active: boolean;
}

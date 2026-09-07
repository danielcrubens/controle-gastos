import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { NotionAuthWebhookDto } from './dto/notion-auth-webhook.dto.js';
import { UserRecord } from './auth.types.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Grava a conexão OAuth gerada no onboarding. Paridade com o n8n: cada
   * callback cria uma NOVA linha pendente (o código é single-use).
   */
  async registerNotionConnection(dto: NotionAuthWebhookDto): Promise<void> {
    const { error } = await this.supabase.table.insert({
      connection_code: dto.connection_code,
      notion_access_token: dto.notion_access_token,
      notion_database_id: dto.notion_database_id,
      telegram_connected: false,
      is_active: true,
    });

    if (error) {
      if (error.code === '23505') {
        this.logger.warn(
          JSON.stringify({
            event: 'connection_code_duplicated',
            connection_code: dto.connection_code,
          }),
        );
        throw new ConflictException('connection_code já existe');
      }
      this.supabase.throwOnError('registerNotionConnection', error);
    }

    this.logger.log(
      JSON.stringify({
        event: 'connection_registered',
        connection_code: dto.connection_code,
      }),
    );
  }

  /** Busca uma conexão pendente pelo código (só aceita código ainda não vinculado a Telegram). */
  async findPendingConnection(code: string): Promise<UserRecord | null> {
    const { data, error } = await this.supabase.table
      .select('*')
      .eq('connection_code', code)
      .eq('telegram_connected', false)
      .limit(1)
      .maybeSingle();

    if (error) this.supabase.throwOnError('findPendingConnection', error);
    return (data as UserRecord | null) ?? null;
  }

  /**
   * Vincula o telegram_id à conta. Desconecta antes qualquer outra linha do
   * mesmo telegram_id — reconexão não pode deixar duas contas "ativas".
   */
  async connectTelegram(
    user: UserRecord,
    telegramId: number,
    username?: string,
  ): Promise<void> {
    const { error: disconnectError } = await this.supabase.table
      .update({ telegram_connected: false })
      .eq('telegram_id', telegramId)
      .neq('id', user.id);

    if (disconnectError)
      this.supabase.throwOnError(
        'connectTelegram.disconnectOld',
        disconnectError,
      );

    const { error } = await this.supabase.table
      .update({
        telegram_id: telegramId,
        telegram_username: username ?? null,
        telegram_connected: true,
      })
      .eq('id', user.id);

    if (error) this.supabase.throwOnError('connectTelegram', error);

    this.logger.log(
      JSON.stringify({
        event: 'telegram_connected',
        user_id: user.id,
        telegram_id: telegramId,
      }),
    );
  }

  /** Usuário conectado E ativo — pré-requisito para o fluxo de voz e relatórios. */
  async findConnectedUser(telegramId: number): Promise<UserRecord | null> {
    const { data, error } = await this.supabase.table
      .select('*')
      .eq('telegram_id', telegramId)
      .eq('telegram_connected', true)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error) this.supabase.throwOnError('findConnectedUser', error);
    return (data as UserRecord | null) ?? null;
  }

  /** Usuário conectado em qualquer estado — usado pelo /cancelar para distinguir "já cancelado". */
  async findConnectedAnyState(telegramId: number): Promise<UserRecord | null> {
    const { data, error } = await this.supabase.table
      .select('*')
      .eq('telegram_id', telegramId)
      .eq('telegram_connected', true)
      .limit(1)
      .maybeSingle();

    if (error) this.supabase.throwOnError('findConnectedAnyState', error);
    return (data as UserRecord | null) ?? null;
  }

  async deactivate(user: UserRecord): Promise<void> {
    const { error } = await this.supabase.table
      .update({ is_active: false, telegram_connected: false })
      .eq('id', user.id);

    if (error) this.supabase.throwOnError('deactivate', error);

    this.logger.log(
      JSON.stringify({ event: 'account_deactivated', user_id: user.id }),
    );
  }
}

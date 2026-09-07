import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAppConfig } from '../config/configuration.js';

/**
 * Client Supabase com service_role: o backend é o único consumidor da tabela
 * `users` e o RLS bloqueia todo o resto (ver supabase/migrations).
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient;

  constructor(configService: ConfigService) {
    const config = getAppConfig(configService);
    this.client = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  }

  get table() {
    return this.client.from('users');
  }

  /** Lança erro legível para falhas do PostgREST (as chamadas do SDK não lançam por si). */
  throwOnError(
    operation: string,
    error: { message: string; code?: string | null; details?: unknown },
  ): never {
    this.logger.error(
      JSON.stringify({
        event: 'supabase_error',
        operation,
        code: error.code,
        message: error.message,
      }),
    );
    throw new Error(`Supabase/${operation}: ${error.message}`);
  }
}

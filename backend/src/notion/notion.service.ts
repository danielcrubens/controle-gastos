import { Injectable, Logger } from '@nestjs/common';
import { APIErrorCode, APIResponseError, Client } from '@notionhq/client';
import { UserRecord } from '../auth/auth.types.js';
import { ParsedExpense } from '../expense-parser/expense-parser.types.js';
import {
  NotionConnectionError,
  NotionQueryError,
  NotionWriteError,
} from './notion.errors.js';

export interface NotionExpenseRow {
  valor: number;
  categoria: string;
}

@Injectable()
export class NotionService {
  private readonly logger = new Logger(NotionService.name);

  /** Cria a página da despesa na database do usuário (colunas Despesa/Categoria/Data/Valor). */
  async createExpense(user: UserRecord, expense: ParsedExpense): Promise<void> {
    const client = this.clientFor(user);
    try {
      await client.pages.create({
        parent: { database_id: user.notion_database_id! },
        properties: {
          Despesa: { rich_text: [{ text: { content: expense.descricao } }] },
          Categoria: { select: { name: expense.categoria } },
          Data: { date: { start: expense.data } },
          Valor: { number: expense.valor },
        },
      });
      this.logger.log(
        JSON.stringify({
          event: 'expense_saved',
          user_id: user.id,
          database_id: user.notion_database_id,
        }),
      );
    } catch (error) {
      this.throwMapped('createExpense', error);
    }
  }

  /**
   * Despesas do intervalo [startISO, endISO] (inclusive), paginando a query —
   * um mês movimentado facilmente passa das 100 páginas padrão.
   */
  async listExpensesBetween(
    user: UserRecord,
    startISO: string,
    endISO: string,
  ): Promise<NotionExpenseRow[]> {
    const client = this.clientFor(user);
    const rows: NotionExpenseRow[] = [];
    let cursor: string | undefined;

    try {
      // SDK 5.x: a query é sobre o data source que sustenta a database.
      const dataSourceId = await this.resolveDataSourceId(
        client,
        user.notion_database_id!,
      );

      do {
        const response = await client.dataSources.query({
          data_source_id: dataSourceId,
          filter: {
            and: [
              { property: 'Data', date: { on_or_after: startISO } },
              { property: 'Data', date: { on_or_before: endISO } },
            ],
          },
          page_size: 100,
          start_cursor: cursor,
        });

        for (const page of response.results) {
          if (!('properties' in page)) continue;
          rows.push(this.toExpenseRow(page.properties));
        }

        cursor = response.has_more
          ? (response.next_cursor ?? undefined)
          : undefined;
      } while (cursor);
    } catch (error) {
      this.throwMapped('listExpensesBetween', error);
    }

    return rows;
  }

  /** Resolve o data source da database do usuário (API 2025-09+ separou os dois ids). */
  private async resolveDataSourceId(
    client: Client,
    databaseId: string,
  ): Promise<string> {
    const database = await client.databases.retrieve({
      database_id: databaseId,
    });
    if ('data_sources' in database && database.data_sources?.[0]?.id) {
      return database.data_sources[0].id;
    }
    // Bases antigas criadas antes da divisão database/data source compartilham o id.
    return databaseId;
  }

  private clientFor(user: UserRecord): Client {
    if (!user.notion_access_token || !user.notion_database_id) {
      this.logger.warn(
        JSON.stringify({
          event: 'notion_missing_credentials',
          user_id: user.id,
        }),
      );
      throw new NotionConnectionError('Usuário sem token/database do Notion');
    }
    return new Client({ auth: user.notion_access_token });
  }

  private toExpenseRow(properties: Record<string, unknown>): NotionExpenseRow {
    const valorProperty = properties['Valor'] as
      { type: string; number: number | null } | undefined;
    const categoriaProperty = properties['Categoria'] as
      { type: string; select: { name?: string } | null } | undefined;

    return {
      valor:
        valorProperty?.type === 'number' && valorProperty.number !== null
          ? valorProperty.number
          : 0,
      categoria:
        categoriaProperty?.type === 'select' && categoriaProperty.select?.name
          ? categoriaProperty.select.name
          : 'Outros',
    };
  }

  private throwMapped(operation: string, error: unknown): never {
    if (error instanceof APIResponseError) {
      if (
        error.code === APIErrorCode.Unauthorized ||
        error.code === APIErrorCode.RestrictedResource
      ) {
        this.logger.warn(
          JSON.stringify({
            event: 'notion_token_rejected',
            operation,
            code: error.code,
          }),
        );
        throw new NotionConnectionError(error.message);
      }
      this.logger.error(
        JSON.stringify({
          event: 'notion_api_error',
          operation,
          code: error.code,
          message: error.message,
        }),
      );
      if (operation === 'listExpensesBetween')
        throw new NotionQueryError(error.message);
      throw new NotionWriteError(error.message);
    }

    this.logger.error(
      JSON.stringify({
        event: 'notion_unexpected_error',
        operation,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    if (error instanceof NotionConnectionError) throw error;
    if (operation === 'listExpensesBetween')
      throw new NotionQueryError(String(error));
    throw new NotionWriteError(String(error));
  }
}

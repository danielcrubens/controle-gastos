import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';
import { validateEnv } from './config/env.validation.js';
import { AuthModule } from './auth/auth.module.js';
import { ExpenseParserModule } from './expense-parser/expense-parser.module.js';
import { NotionModule } from './notion/notion.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { TelegramModule } from './telegram/telegram.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    SupabaseModule,
    AuthModule,
    ExpenseParserModule,
    NotionModule,
    ReportsModule,
    TelegramModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

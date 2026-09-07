import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ExpenseParserModule } from '../expense-parser/expense-parser.module.js';
import { NotionModule } from '../notion/notion.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { TelegramController } from './telegram.controller.js';
import { TelegramService } from './telegram.service.js';
import { UpdateRouterService } from './update-router.service.js';
import { VoiceExpenseService } from './voice-expense.service.js';

@Module({
  imports: [AuthModule, ExpenseParserModule, NotionModule, ReportsModule],
  controllers: [TelegramController],
  providers: [TelegramService, UpdateRouterService, VoiceExpenseService],
  exports: [TelegramService],
})
export class TelegramModule {}

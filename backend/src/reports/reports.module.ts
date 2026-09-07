import { Module } from '@nestjs/common';
import { NotionModule } from '../notion/notion.module.js';
import { BudgetRuleService } from './budget-rule.service.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [NotionModule],
  providers: [BudgetRuleService, ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

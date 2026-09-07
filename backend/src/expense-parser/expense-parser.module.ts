import { Module } from '@nestjs/common';
import { ExpenseParserService } from './expense-parser.service.js';

@Module({
  providers: [ExpenseParserService],
  exports: [ExpenseParserService],
})
export class ExpenseParserModule {}

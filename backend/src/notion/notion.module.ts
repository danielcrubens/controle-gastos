import { Module } from '@nestjs/common';
import { NotionService } from './notion.service.js';

@Module({
  providers: [NotionService],
  exports: [NotionService],
})
export class NotionModule {}

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { getAppConfig } from './config/configuration.js';
import { TelegramService } from './telegram/telegram.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const configService = app.get(ConfigService);
  const config = getAppConfig(configService);

  await app.listen(config.port);
  const url = await app.getUrl();
  Logger.log(`HTTP ouvindo em ${url}`, 'Bootstrap');

  if (config.telegram.setWebhook) {
    await app.get(TelegramService).registerWebhook();
  }
}
await bootstrap();

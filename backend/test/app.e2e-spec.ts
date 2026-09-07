import { vi } from 'vitest';
import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

// Credenciais dummy. `vi.hoisted` roda ANTES dos imports — necessário porque a
// validação de env acontece dentro do ConfigModule.forRoot(), executado na
// avaliação do decorator do AppModule (no import). Nenhuma chamada externa
// acontece nos testes: o processamento do webhook é async e falhas viram log.
vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN ??= '1:TEST';
  process.env.TELEGRAM_WEBHOOK_SECRET ??= 'test-secret-e2e';
  process.env.APP_BASE_URL ??= 'http://localhost:3000';
  process.env.GEMINI_API_KEY ??= 'test-gemini-key';
  process.env.SUPABASE_URL ??= 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role';
});

describe('App (e2e)', () => {
  let app: INestApplication<App> | undefined;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('GET / responde health check', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({ status: 'ok', service: 'fale-e-pronto-backend' });
  });

  it('POST /telegram/webhook rejeita secret inválido', () => {
    return request(app.getHttpServer())
      .post('/telegram/webhook')
      .set('x-telegram-bot-api-secret-token', 'segredo-errado')
      .send({ update_id: 1 })
      .expect(401);
  });

  it('POST /telegram/webhook responde 200 imediatamente com secret válido', () => {
    return request(app.getHttpServer())
      .post('/telegram/webhook')
      .set('x-telegram-bot-api-secret-token', 'test-secret-e2e')
      .send({
        update_id: 1,
        message: {
          message_id: 1,
          date: 1757000000,
          chat: { id: 42 },
          from: { id: 42 },
          text: '/regra 1000',
        },
      })
      .expect(200);
  });

  it('POST /webhooks/notion-auth rejeita body sem os campos do contrato', () => {
    return request(app.getHttpServer())
      .post('/webhooks/notion-auth')
      .send({})
      .expect(400);
  });
});

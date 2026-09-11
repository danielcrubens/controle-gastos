# Fale e Pronto — Backend (NestJS)

Substituto do fluxo n8n: webhook do Telegram → autenticação no Supabase → extração
da despesa com Gemini (áudio direto) → gravação no Notion do usuário.

Ver [../arquiterura.md](../arquiterura.md) para o desenho de arquitetura e o
mapeamento nodes do n8n → módulos.

## Setup

```bash
npm install
cp .env.example .env   # preencher com as credenciais reais
```

### 1. Supabase

Aplicar a migration (a tabela `users` não existia antes — este backend substitui
o armazenamento que o n8n usava):

- SQL Editor do Supabase: colar `supabase/migrations/0001_create_users.sql` e executar, ou
- CLI: `supabase link --project-ref <ref> && supabase db push`

A tabela tem RLS habilitado **sem policies**: apenas a `SUPABASE_SERVICE_ROLE_KEY`
(usada por este backend) acessa os dados.

### 2. Front de onboarding

Nenhuma mudança de código — só apontar a env do front para o backend:

```
BACKEND_WEBHOOK_URL=https://<seu-backend>/webhooks/notion-auth
```

O contrato enviado pelo front é `{ connection_code, notion_access_token, notion_database_id }`
(POST JSON) e a resposta esperada é `{ "success": true }`.

### 3. Webhook do Telegram

Com `TELEGRAM_SET_WEBHOOK=true` o backend registra o webhook no boot apontando
`APP_BASE_URL/telegram/webhook` com `secret_token` (validado no header
`X-Telegram-Bot-Api-Secret-Token`). O app precisa estar publicamente acessível
(ngrok em dev: `ngrok http 3000` + `APP_BASE_URL=https://...ngrok...`).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | sim | Token do @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | sim | Segredo do webhook (≥ 8 chars) |
| `APP_BASE_URL` | sim | URL pública do backend (setWebhook) |
| `GEMINI_API_KEY` | sim | Chave do Google AI Studio |
| `SUPABASE_URL` | sim | URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Service role (contorna RLS) |
| `SITE_URL` | não | Site exibido nas mensagens (default: faleiepronto.com.br) |
| `GEMINI_MODEL` | não | Default: `gemini-2.5-flash` |
| `TZ` | não | Fuso p/ datas e meses (default: `America/Sao_Paulo`) |
| `TELEGRAM_SET_WEBHOOK` | não | `true` registra o webhook no boot |
| `PORT` | não | Default: `3000` |
| `DISCORD_WEBHOOK_URL` | não | Notifica cancelamentos (paridade com o n8n) |

Env inválida → o app **não sobe** (validação com class-validator no boot).

## Rotas

| Método | Rota | Consumidor | Função |
|---|---|---|---|
| POST | `/telegram/webhook` | Telegram | Recebe updates (responde 200 na hora; processa async) |
| POST | `/webhooks/notion-auth` | Front de onboarding | Grava conexão OAuth do Notion (substitui webhook n8n) |
| GET | `/` | Deploy/monitor | Health check |

## Comandos do bot

- `/start <código>` — vincula o Telegram à conta (código do onboarding)
- voz/áudio — extrai a despesa (Gemini) e grava no Notion; sem valor falado, o bot pede o valor
- `/resumo` — mês corrente por categoria
- `/mes_anterior` — mês anterior por categoria
- `/regra <valor>` — distribuição 70/20/10 (ex.: `/regra 5000`; aceita `5.000` e `1.234,56`)
- `/cancelar` — desativa a conta (`is_active=false`)

## Desenvolvimento

```bash
npm run start:dev    # watch mode
npm run build
npm run lint         # oxlint
npm run format       # prettier
npm run test         # unit (vitest)
npm run test:e2e
npm run test:cov
```

Teste único: `npx vitest run src/reports/budget-rule.service.spec.ts`

## Estrutura

```
src/
  config/          # env tipada + validação no boot
  common/          # categorias permitidas, formatação/datas (TZ pt-BR)
  supabase/        # client service_role
  auth/            # tabela users, código de conexão, status da conta
  expense-parser/  # Gemini (áudio inline + responseSchema) e validação do JSON
  notion/          # client por usuário, createPage, query paginada
  telegram/        # webhook (200 async), roteamento de comandos, fluxo de voz
  reports/         # /resumo, /mes_anterior, regra 70/20/10
```

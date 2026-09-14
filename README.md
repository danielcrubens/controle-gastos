# Falei e Pronto 💬

Controle de gastos por voz: o usuário manda um áudio no Telegram descrevendo um gasto ("gastei vinte reais no almoço") e o sistema extrai os dados com IA e grava a despesa direto na database do Notion dele. Multi-tenant — cada usuário conecta a própria conta Notion via onboarding web.

## Como funciona

```
Onboarding (web)                         Dia a dia
─────────────────                         ─────────────────────────────────────
faleiepronto.com.br (Nuxt)                Telegram (áudio de voz)
  │ "Conectar com Notion" (OAuth)            │
  ▼                                          ▼
Backend NestJS  ──►  Supabase             Backend NestJS
(connection_code,                         │  autentica o telegram_id
 notion_token, database_id)               ▼
  │                                     Gemini (transcreve + extrai
  ▼                                     JSON: despesa, categoria,
Usuário digita /start <código>          data, valor — uma chamada só)
no bot e a conta é vinculada               │
                                           ▼
                                        Notion do usuário (página criada)
```

Comandos do bot: `/start <código>` (vínculo), voz/áudio (registra gasto), `/resumo`, `/mes_anterior`, `/regra <valor>` (70/20/10) e `/cancelar`.

## Estrutura do monorepo

```
├── front/      Nuxt 3 — site de onboarding (Notion OAuth) · deploy: Netlify
├── backend/    NestJS 12 — orquestração (Telegram → Gemini → Notion) · deploy: Render
├── supabase/   (dentro de backend/) migration da tabela users

```


## Stack

| Camada | Tecnologias |
|---|---|
| Front | Nuxt 3, Vue 3, Tailwind CSS, server routes (h3) com sessão em cookie |
| Backend | NestJS 12 (ESM), Telegraf, Gemini (`@google/genai`), Notion API, Supabase |
| Infra | Netlify (front), Render (backend), Supabase (Postgres/auth de conexão) |
| Testes/Qualidade | Vitest (unit + e2e), oxlint, Prettier (backend) |


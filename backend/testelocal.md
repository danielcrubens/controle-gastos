# Teste local do backend (Postman / Thunder Client)

Guia passo a passo para exercitar todos os fluxos do backend **sem precisar do
deploy**: as requisições do Telegram e do front são simuladas manualmente, e as
respostas do bot chegam no seu chat real do Telegram.

> **Conceito importante antes de começar:** os dois webhooks respondem na hora
> (`200 OK`) e o processamento roda em background. Ou seja: a resposta HTTP que
> você vê no Postman/Thunder Client **não contém o resultado** — o resultado
> aparece em (1) a mensagem que o bot manda no seu Telegram, (2) os logs do
> terminal do backend e (3) o Supabase/Notion.

---

## 1. Ajuste o `.env` para modo local

`.env` do `backend/`:

```env
TELEGRAM_BOT_TOKEN=<token real do @BotFather>
TELEGRAM_WEBHOOK_SECRET=meu-segredo-local-123
APP_BASE_URL=http://localhost:3000
SITE_URL=https://faleiepronto.com.br
TELEGRAM_SET_WEBHOOK=false
GEMINI_API_KEY=<chave real>
GEMINI_MODEL=gemini-2.5-flash
SUPABASE_URL=<url real>
SUPABASE_SERVICE_ROLE_KEY=<chave real>
TZ=America/Sao_Paulo
PORT=3000
```

Dois pontos críticos:

- **`TELEGRAM_SET_WEBHOOK=false`** — com `true` o backend tenta registrar o
  webhook no boot apontando para `APP_BASE_URL`; o Telegram exige HTTPS e o
  processo **morre na inicialização**. Além disso, com webhook ativo não é
  possível usar `getUpdates` (passo 2).
- **`TELEGRAM_WEBHOOK_SECRET`** — é o valor que você vai colocar no header de
  toda requisição para `/telegram/webhook`. Escolha um que seja fácil de
  reproduzir no Postman.

## 2. Suba o backend

```bash
cd backend
npm run start:dev
```

Confirme no log: `HTTP ouvindo em http://localhost:3000`. Deixe esse terminal
aberto — **todos os eventos aparecem aqui em JSON** (`connection_registered`,
`telegram_connected`, `expense_parsed`, `expense_saved`, etc.).

## 3. Descubra seu `telegram_id` / `chat_id` (uma vez só)

1. Abra seu bot no app do Telegram e mande uma mensagem qualquer (ex.: "oi").
2. Pegue o id chamando no navegador ou no Postman (GET):

```
https://api.telegram.org/bot<SEU_TELEGRAM_BOT_TOKEN>/getUpdates
```

3. Na resposta, copie:
   - `result[...].message.from.id` → seu **telegram_id**
   - `result[...].message.chat.id` → seu **chat_id** (em chat privado é igual ao from.id)
   - `message.from.first_name` e `message.from.username` — opcional, deixa as
     mensagens de teste mais realistas

> Em chat privado `chat.id == from.id`, então um único número serve nos dois
> campos dos JSONs abaixo.

## 4. (Só para o teste de voz) Pegue um `file_id` de áudio real

O `file_id` precisa ser de um arquivo que existe nos servidores do Telegram —
não dá para inventar.

1. No app do Telegram, **segure o botão de microfone** e grave um áudio curto
   para o bot dizendo uma despesa, ex.: *"almoço no restaurante vinte e cinco reais"*.
2. Chame `getUpdates` de novo (passo 3) e copie do voice message:
   - `message.voice.file_id`
   - `message.voice.mime_type` (normalmente `audio/ogg`)
   - `message.voice.duration`

Guarde esse `file_id` — ele pode ser reutilizado quantas vezes quiser.

---

## 5. Requisições no Postman / Thunder Client

Base URL: `http://localhost:3000`.
As requisições 5.2 em diante são todas **POST** com header:

```
x-telegram-bot-api-secret-token: meu-segredo-local-123
Content-Type: application/json
```

Substitua `111111111` pelo seu id e `CODIGO123` pelo código que você gerou.

### 5.1. Health check — `GET /`

Resposta esperada:

```json
{ "status": "ok", "service": "fale-e-pronto-backend" }
```

### 5.2. Conexão OAuth (simula o front de onboarding) — `POST /webhooks/notion-auth`

```json
{
  "connection_code": "CODIGO123",
  "notion_access_token": "secret_<token real ou de teste do Notion>",
  "notion_database_id": "<id de 32 hex da sua database>"
}
```

- Resposta: `201` com `{ "success": true }`
- **Verificar:** no Supabase, tabela `users` tem uma linha nova com
  `connection_code = CODIGO123`, `telegram_connected = false`, `is_active = true`.
- `notion_database_id`: copie da URL da database no Notion (os 32 caracteres
  hex do link). A database precisa estar **compartilhada com a integração**
  (no OAuth real isso é automático; se você criou um token interno manualmente,
  abra a database → ⋯ → Conexões → adicione a integração).

> Alternativa mais completa: rode o front (`cd front && npm run dev`) com
> `N8N_WEBHOOK_URL=http://localhost:3000/webhooks/notion-auth` no `front/.env` e
> clique em "Conectar com Notion" — o front faz exatamente essa chamada. O
> Postman serve para testar sem depender do front.

### 5.3. Comando `/start` — `POST /telegram/webhook`

```json
{
  "update_id": 1,
  "message": {
    "message_id": 1,
    "from": { "id": 111111111, "is_bot": false, "first_name": "Daniel", "username": "danielcrubens" },
    "chat": { "id": 111111111, "first_name": "Daniel", "type": "private" },
    "date": 1787769600,
    "text": "/start CODIGO123"
  }
}
```

- Resposta HTTP: `200` com `OK` (imediato).
- **Verificar:** mensagem no seu Telegram: *"Olá, Daniel, você está conectado!"*
  e no Supabase a linha do código agora tem `telegram_connected = true` e
  `telegram_id` preenchido.
- Log esperado: `telegram_connected`.

### 5.4. Comando `/regra` — não precisa de conta

```json
{
  "update_id": 2,
  "message": {
    "message_id": 2,
    "from": { "id": 111111111 },
    "chat": { "id": 111111111, "type": "private" },
    "date": 1787769600,
    "text": "/regra 5000"
  }
}
```

- **Verificar:** mensagem no Telegram com os 70/20/10 de 5000
  (3.500,00 / 1.000,00 / 500,00). Experimente também `/regra 1.234,56` e
  `/regra` (sem argumento → mensagem de formato inválido).

### 5.5. Mensagem de voz — o fluxo principal

`date` em **unix seconds** — use um horário recente para a despesa cair no mês
corrente (`/resumo`) ou `1786795200` (15/08/2026) para cair no mês anterior
(`/mes_anterior`).

```json
{
  "update_id": 3,
  "message": {
    "message_id": 3,
    "from": { "id": 111111111, "is_bot": false, "first_name": "Daniel" },
    "chat": { "id": 111111111, "type": "private" },
    "date": 1787769600,
    "voice": {
      "file_id": "<file_id copiado no passo 4>",
      "duration": 4,
      "mime_type": "audio/ogg"
    }
  }
}
```

- **Verificar:** confirmação no Telegram (*✅ Despesa registrada com sucesso!*
  com descrição, categoria, data e valor) e a **página nova na sua database do
  Notion**.
- Logs esperados, nesta ordem: `expense_parsed` → `expense_saved`.
- Este teste exercita Gemini + Notion de verdade — pode demorar alguns segundos
  entre o POST e a mensagem no Telegram. É normal.
- Variações úteis:
  - Áudio **sem valor falado** → mensagem pedindo o valor
    (log `expense_validation_failed` com `reason: missing_value`).
  - Áudio dizendo **"ontem"** → despesa gravada com D-1.

### 5.6. Relatórios

Mesmos headers, mudando só o `text`:

```json
{ "update_id": 4, "message": { "message_id": 4, "from": { "id": 111111111 }, "chat": { "id": 111111111, "type": "private" }, "date": 1787769600, "text": "/resumo" } }
```

```json
{ "update_id": 5, "message": { "message_id": 5, "from": { "id": 111111111 }, "chat": { "id": 111111111, "type": "private" }, "date": 1787769600, "text": "/mes_anterior" } }
```

- **Verificar:** resumo por categoria no Telegram (com o emoji de cada
  categoria) conferindo com as páginas do Notion.
- Sem despesas no período → mensagem *"Ainda não há resumo por aqui."*

### 5.7. Comando `/cancelar`

```json
{ "update_id": 6, "message": { "message_id": 6, "from": { "id": 111111111 }, "chat": { "id": 111111111, "type": "private" }, "date": 1787769600, "text": "/cancelar" } }
```

- **Verificar:** confirmação no Telegram; no Supabase a linha fica com
  `is_active = false` e `telegram_connected = false`.
- Com `DISCORD_WEBHOOK_URL` configurada, o canal do Discord recebe a notificação.

## 6. Testes de erro (cenários negativos)

| # | Requisição | Esperado |
|---|---|---|
| 1 | `POST /telegram/webhook` **sem** o header `x-telegram-bot-api-secret-token` | `401` (log `webhook_secret_mismatch`) |
| 2 | Header com valor diferente do `.env` | `401` |
| 3 | `POST /webhooks/notion-auth` com `{}` | `400` (DTO com campos faltando) |
| 4 | `/start CODIGOINVALIDO` (código que não existe) | mensagem *"Código inválido ou já usado"* (log `invalid_connection_code`) |
| 5 | `/start` com um código **já usado** | mesma mensagem (o n8n exigia `telegram_connected = false`) |
| 6 | `/resumo` **antes** de conectar (ou após cancelar) | mensagem *"Cadastre-se primeiro"* |
| 7 | Voz com `file_id` inventado | mensagem de erro genérica (log `voice_flow_failed` ou `update_failed`) — o webhook continua respondendo `200` |
| 8 | `/cancelar` duas vezes | segunda vez: *"Sua conta já foi cancelada anteriormente"* |
| 9 | Texto qualquer sem `/` (ex.: `"oi"`) | `200` e **nada acontece** (comportamento paridade com o n8n) |

Depois do cenário 6/8 (conta cancelada), para testar de novo: gere outro código
no passo 5.2 e refaça o `/start` — cada OAuth do front cria uma linha nova
(código single-use), é o desenho esperado.

## 7. (Opcional) Teste ponta a ponta com Telegram real

Para receber mensagens **reais** do Telegram (sem Postman):

1. Exponha a porta com um túnel: `ngrok http 3000`.
2. No `.env`: `APP_BASE_URL=https://xxxx.ngrok-free.app` e
   `TELEGRAM_SET_WEBHOOK=true`.
3. Reinicie o backend (log `webhook_registered` confirma o registro).
4. Use o bot normalmente no app: `/start <código>`, áudios, `/resumo` etc.

Para desligar o webhook quando terminar (senão o Telegram continua mandando
updates para o túnel morto):

```
https://api.telegram.org/bot<TOKEN>/deleteWebhook
```

## 8. Solução de problemas rápidos

| Sintoma | Causa provável |
|---|---|
| Backend morre ao subir falando de env | `.env` incompleto — a validação é fail-fast de propósito; confira a mensagem, ela lista os campos |
| `401` no webhook | header ausente ou diferente do `TELEGRAM_WEBHOOK_SECRET` |
| `200` mas nenhuma mensagem no Telegram | `chat_id` não é o seu (confira no `getUpdates`), ou o bot foi bloqueado; veja log `telegram_send_failed` |
| Mensagens chegam duplicadas | você está com webhook ativo **e** simulando por Postman ao mesmo tempo — delete o webhook |
| `expense_parsed` ok mas nada no Notion | token/database inválidos ou database não compartilhada com a integração; veja log `notion_api_error` / `notion_token_rejected` |
| Despesa com data errada | confira o campo `date` do update (unix seconds) e o `TZ` do `.env` |

# Deploy do backend no Render

Passo a passo para publicar o backend NestJS no Render (web service) e plugar o
Telegram + front de onboarding nele.

---

## 1. Publicar o código no GitHub

O `backend/` é um repositório git próprio (aninhado na pasta do projeto) e ainda
está **sem commits**. A forma mais simples é publicá-lo como repositório próprio:

```bash
cd backend
git add .
git commit -m "feat: backend NestJS substituindo o fluxo n8n"
git branch -M main
git remote add origin git@github.com:<seu-usuario>/fale-e-pronto-backend.git
git push -u origin main
```

- O `.gitignore` já exclui `.env` e `node_modules` — confira com `git status`
  que **nenhum segredo vai no commit**.
- Alternativa (monorepo): se preferir um repo único com `front/` + `backend/`,
  seria preciso antes reorganizar o git da raiz (hoje a raiz ainda rastreia o
  layout antigo e o `backend/` tem `.git` próprio). Para o primeiro deploy, o
  repositório próprio é o caminho rápido.

## 2. Supabase

Se a migration `supabase/migrations/0001_create_users.sql` já foi aplicada no
seu projeto (está sendo usada no teste local), **nada a fazer** — o mesmo
projeto Supabase serve para produção. Se estiver usando um projeto separado de
produção, aplique a migration lá (SQL Editor).

## 3. Criar o Web Service no Render

1. [dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**.
2. Conecte o repositório GitHub criado no passo 1.
3. Preencha:
   - **Name:** `fale-e-pronto-backend` (define a URL: `https://fale-e-pronto-backend.onrender.com`)
   - **Language:** Node
   - **Root Directory:** vazio (o repo é só do backend)
   - **Build Command:** `npm install --legacy-peer-deps && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Instance Type:** Free
   - **Health Check Path:** `/`

> Por que `--legacy-peer-deps` no build: o npm 10.x quebrou resolvendo os peer
> deps do Vitest 4 (bug do Arborist, `edgesOut`). Se o build do Render falhar
> com esse erro, é isso; com uma versão de npm mais nova pode até dispensar a flag.
>
> Porta: o Render injeta `PORT` automaticamente e o backend já escuta nela
> (`process.env.PORT`) — nada para configurar.

## 4. Variáveis de ambiente no Render

Em **Environment → Environment Variables**, adicione (mesmos nomes do `.env` local):

| Variável | Valor |
|---|---|
| `NODE_VERSION` | `22` (mesma versão do seu ambiente local) |
| `TELEGRAM_BOT_TOKEN` | token real do @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | segredo forte e aleatório (pode ser o mesmo do local) |
| `APP_BASE_URL` | `https://fale-e-pronto-backend.onrender.com` (**https**, sem barra no fim) |
| `TELEGRAM_SET_WEBHOOK` | `true` |
| `SITE_URL` | `https://faleiepronto.com.br` |
| `GEMINI_API_KEY` | sua chave do Google AI Studio |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |
| `TZ` | `America/Sao_Paulo` |
| `DISCORD_WEBHOOK_URL` | (opcional) webhook do Discord para cancelamentos |

Clique **Save** — o Render faz o primeiro deploy sozinho.

## 5. Conferir o deploy

1. Aba **Events/Logs**: espere
   - `HTTP ouvindo em https://...onrender.com` (Bootstrap)
   - `{"event":"webhook_registered","url":"https://.../telegram/webhook"}` —
     confirma que o Telegram já sabe onde mandar os updates.
2. Abra `https://<seu-service>.onrender.com/` no navegador → deve responder
   `{"status":"ok","service":"fale-e-pronto-backend"}`.
3. Confira o webhook pelo Telegram:
   `https://api.telegram.org/bot<TOKEN>/getWebhookInfo` →
   `url` deve ser a do Render e `last_error_message` vazio.

> Se o log de `webhook_registered` não aparecer e o boot falhar mencionando
> setWebhook: confira que `APP_BASE_URL` é HTTPS e `TELEGRAM_SET_WEBHOOK=true`.

## 6. Apontar o front para o backend

No Netlify (variável do front): troque o valor de `N8N_WEBHOOK_URL` para

```
https://fale-e-pronto-backend.onrender.com/webhooks/notion-auth
```

e faça redeploy do site. **Nenhuma linha de código do front muda** — o
contrato `POST { connection_code, notion_access_token, notion_database_id }`
já é exatamente o que o backend espera.

## 7. Validação ponta a ponta em produção

Mesmos fluxos do [testelocal.md](testelocal.md), agora de verdade:

1. Abra o site de onboarding → "Conectar com Notion" → autorize.
2. Pegue o código `/start <código>` mostrado no site e envie ao bot.
3. Grave um áudio descrevendo uma despesa → confirme a resposta do bot e a
   página na sua database do Notion.
4. `/resumo` e `/mes_anterior` → confira os totais.
5. `/cancelar` → envie um áudio depois; o bot deve responder "Cadastre-se primeiro".

## 8. Particularidades do plano Free do Render

- **Sleep:** sem tráfego por ~15 min a instância dorme. A próxima mensagem ao
  bot sofre cold start (~30–60s); o Telegram reenvia o update e o fluxo se
  resolve sozinho. Para evitar, um pinger (ex.: UptimeRobot batendo em `/`
  a cada 5 min) mantém o serviço acordado — no limite do plano, avalie o
  Starter ($7/mês) quando houver usuários pagantes.
- **Horas:** 750 h/mês grátis por conta (uma instância 24/7 consome ~744 h).
- Logs ficam disponíveis apenas por um período curto no plano free — para
  investigar incidentes antigos, considere log drain futuramente.

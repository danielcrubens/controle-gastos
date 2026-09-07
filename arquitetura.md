# Fale e Pronto — Nova arquitetura (saindo do n8n)
 
## Contexto
 
O sistema original rodava inteiramente no n8n: Telegram Trigger → autenticação via código de conexão (Supabase) → recebimento do áudio → transcrição → extração via IA → gravação no Notion → confirmação no Telegram. Também existiam os comandos `/resumo`, `/mes_anterior`, `/cancelar` e o cálculo da regra 70/20/10.
 
Decisão: sair do n8n, manter Telegram + Notion como interface e destino de dados, e reconstruir a orquestração em **NestJS**, usando a **IA de voz do Gemini** (multimodal) para transcrição + extração em uma única chamada.
 
 | Necessidade | Recomendação | Por quê |
|---|---|---|
| Backend / orquestração (substitui o n8n) | **NestJS** | Resolve o problema técnico e avança a meta de full stack |
| Onboarding + futuro dashboard | **Nuxt** | Reaproveita a experiência já existente (SPA/SSR/SSG, Pinia) |
| App nativo (React Native) | Não prioritário | Só faria sentido para push notifications nativas; não é o gargalo atual |
| Vue + Lynx.js | Evitar | Framework novo, ecossistema imaturo — risco desnecessário para um produto já com usuários pagantes |
 
## Arquitetura
 
```
Telegram (envia o áudio)
   │
   ▼
Backend NestJS (orquestra tudo)
   │                    │
   ▼                    ▼
Gemini              Supabase
(ouve o áudio e     (usuários e auth)
extrai o JSON)
   │
   ▼
Notion (salva a despesa)
```
 
Fluxo: o NestJS recebe o webhook do Telegram, baixa o arquivo de voz (`.ogg`), consulta o Supabase para saber a quem pertence e qual o token de acesso ao Notion daquele usuário, envia o áudio direto para o Gemini (que transcreve e extrai os dados em uma única chamada) e grava o resultado na database do Notion do usuário.
 
## Por que o Supabase continua sendo necessário
 
O Notion guarda os dados do negócio (as despesas: `Despesa`, `Categoria`, `Data`, `Valor`). O Supabase guarda os dados da aplicação: quem é o usuário, se está ativo, e principalmente o **token de acesso à conta Notion de cada usuário** — já que o "Fale e Pronto" é multi-tenant (cada usuário tem sua própria database no Notion).
 
Sem essa camada não seria possível responder:
- Esse `telegram_id` que mandou o áudio agora — de qual conta Notion devo salvar essa despesa?
- Esse usuário já conectou o Telegram, ou ainda está pendente?
- A assinatura dele ainda está ativa, ou ele cancelou?
Se fosse um uso pessoal (um único usuário, sem multi-tenant), o Supabase seria dispensável — bastaria fixar o token do Notion numa variável de ambiente. Mas pelo desenho original (código de conexão, `telegram_connected`, `is_active`), o produto foi pensado como multi-usuário, e o Supabase é a ponte entre "quem está falando no Telegram" e "qual Notion mexer".
 
## Mapeamento: nodes do n8n → módulos do NestJS
 
| Node do n8n | Vira no NestJS |
|---|---|
| Telegram Trigger | Controller com webhook do Telegraf (`@Update()`) |
| É /start? → Buscar Código → Código válido? → Conectar Telegram | `AuthService` com query no Supabase + handler do comando `/start` |
| Boas-vindas / Código Inválido | `bot.reply(...)` dentro do handler |
| É áudio? | Checagem de `ctx.message.voice` no handler de mensagem |
| Buscar Usuário / Cadastrado? | `AuthService.findByTelegramId()` |
| GetFile | `bot.telegram.getFileLink()` + download do buffer |
| Transcrever + Parse | Uma chamada única ao Gemini (transcrição + extração juntas) |
| Salvar Notion / Confirmar | `NotionService.createPage()` + `bot.reply()` |
| /resumo, /mes_anterior, regra 70/20/10, /cancelar | Handlers de comando separados, cada um com sua query no Supabase |
 
Estrutura de módulos sugerida:
 
```
src/
  telegram/       # webhook, comandos, roteamento de mensagens
  auth/           # Supabase: usuários, código de conexão, status da conta
  expense-parser/ # chamada ao Gemini com áudio
  notion/         # cliente da API do Notion
  reports/        # /resumo, /mes_anterior, regra 70/20/10
```
 
## Extração de despesas com Gemini (áudio direto)
 
Como o Gemini entende áudio nativamente, a transcrição e a extração acontecem em uma única chamada — não é mais necessário um prompt de "transcrição em texto" separado (esse modelo antigo, pensado para Whisper + LLM em texto, fica obsoleto e só voltaria a ser útil como fallback caso o Gemini fique indisponível).
 
```typescript
// expense-parser.service.ts
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
 
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash', // suporta áudio nativamente
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        despesa: { type: SchemaType.STRING },
        categoria: {
          type: SchemaType.STRING,
          enum: ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Compras', 'Educação', 'Serviços', 'Outros'],
        },
        data: { type: SchemaType.STRING }, // YYYY-MM-DD
        valor: { type: SchemaType.NUMBER, nullable: true },
      },
      required: ['despesa', 'categoria', 'data', 'valor'],
    },
  },
});
 
async function extrairDespesa(audioBuffer: Buffer, mimeType: string) {
  const hoje = new Date().toISOString().slice(0, 10);
 
  const result = await model.generateContent([
    {
      text: `Você é um extrator de dados financeiros. Ouça o áudio a seguir, onde uma
pessoa fala em português descrevendo um gasto, e extraia os dados no schema JSON definido.
 
Regras:
- Interprete valores falados naturalmente: "vinte e cinco reais" = 25.00, "cinquenta conto" = 50.00.
- Se não houver data explícita no áudio, use a data de hoje: ${hoje}.
- Se houver mais de uma despesa no áudio, extraia apenas a primeira.
- Se não conseguir identificar um valor numérico, retorne valor null.
- Nunca invente informações que não estejam no áudio.`,
    },
    {
      inlineData: {
        mimeType, // 'audio/ogg' — formato que o Telegram entrega
        data: audioBuffer.toString('base64'),
      },
    },
  ]);
 
  return JSON.parse(result.response.text());
}
```
 
### Pontos de atenção
 
- **`responseSchema`** substitui a necessidade de instruir "retorne só JSON, sem markdown" no prompt — o Gemini já força o formato, reduzindo erros de parse.
- **Formato de áudio**: o Telegram entrega voice messages em `.ogg` (Opus). O Gemini aceita esse mimetype direto, sem necessidade de conversão.
- **Tamanho do áudio**: para mensagens curtas, enviar o buffer inline funciona bem; considerar a Gemini File API só se um dia precisar aceitar áudios mais longos.
- **Fallback**: manter a checagem de `categoria` fora da lista permitida e tratar `valor: null` pedindo confirmação ao usuário no Telegram — validação que o n8n dava de graça e que agora fica por conta do NestJS.
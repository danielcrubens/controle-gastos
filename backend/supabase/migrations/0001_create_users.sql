-- Fale e Pronto — tabela de usuários da aplicação (multi-tenant).
-- Aplicar no Supabase: SQL Editor ou `supabase db push`.
-- O backend usa a SERVICE_ROLE_KEY (contorna RLS); sem policies, só ele acessa.

create table if not exists public.users (
  id                  uuid primary key default gen_random_uuid(),
  connection_code     text not null unique,
  notion_access_token text,
  notion_database_id  text,
  telegram_id         bigint,
  telegram_username   text,
  telegram_connected  boolean not null default false,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Consultas do backend sempre filtram por telegram_id + telegram_connected
-- (e is_active no fluxo de voz/relatórios); o índice parcial atende as duas.
create index if not exists users_telegram_connected_idx
  on public.users (telegram_id)
  where telegram_connected = true;

alter table public.users enable row level security;

-- Notas:
-- - connection_code único: o onboarding gera um novo a cada OAuth do Notion
--   (paridade com o insert do n8n), e o backend devolve 409 em colisão.
-- - telegram_id não é unique de propósito: uma reconexão cria linha nova e a
--   anterior permanece (desconectada); o backend desconecta as antigas ao vincular.
-- - Para reconexões: o frontend gera código novo a cada OAuth, então não há fluxo
--   que reutilize código usado.

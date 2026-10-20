-- =========================================================
-- NOSSO APP · FASE 1 (BASE)
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > colar > Run
-- =========================================================

-- ---------- PERFIS ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  criado_em timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "perfis visiveis para logados" on public.profiles;
create policy "perfis visiveis para logados" on public.profiles
  for select to authenticated using (true);

drop policy if exists "cada um edita o proprio perfil" on public.profiles;
create policy "cada um edita o proprio perfil" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Cria o perfil automaticamente quando um usuário é criado
create or replace function public.criar_perfil_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

-- Caso os usuários já tenham sido criados antes deste script
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ---------- DISPOSITIVOS COM NOTIFICAÇÃO ATIVADA ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  dispositivo text,
  criado_em timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "cada um gerencia seus dispositivos" on public.push_subscriptions;
create policy "cada um gerencia seus dispositivos" on public.push_subscriptions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- HISTÓRICO DE NOTIFICAÇÕES ----------
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  destinatario uuid not null references auth.users(id) on delete cascade,
  remetente uuid references auth.users(id) on delete set null,
  titulo text not null,
  corpo text,
  url text,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);

create index if not exists notificacoes_destinatario_idx
  on public.notificacoes (destinatario, criado_em desc);

alter table public.notificacoes enable row level security;

drop policy if exists "cada um ve suas notificacoes" on public.notificacoes;
create policy "cada um ve suas notificacoes" on public.notificacoes
  for select to authenticated using (auth.uid() = destinatario);

drop policy if exists "cada um marca suas notificacoes" on public.notificacoes;
create policy "cada um marca suas notificacoes" on public.notificacoes
  for update to authenticated using (auth.uid() = destinatario) with check (auth.uid() = destinatario);

-- Tempo real: o app recebe a notificação na hora quando está aberto
do $$
begin
  alter publication supabase_realtime add table public.notificacoes;
exception when duplicate_object then null;
end $$;

-- ---------- CONFIGURAÇÕES DO CASAL ----------
create table if not exists public.configuracoes (
  chave text primary key,
  valor jsonb,
  atualizado_em timestamptz not null default now()
);

alter table public.configuracoes enable row level security;

drop policy if exists "casal le configuracoes" on public.configuracoes;
create policy "casal le configuracoes" on public.configuracoes
  for select to authenticated using (true);

drop policy if exists "casal altera configuracoes" on public.configuracoes;
create policy "casal altera configuracoes" on public.configuracoes
  for all to authenticated using (true) with check (true);

insert into public.configuracoes (chave, valor)
values ('data_casamento', '"2027-09-09"')
on conflict (chave) do nothing;

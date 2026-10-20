-- ---------- DESAFIOS ----------
create table if not exists public.desafios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  formato text not null default 'juntos' check (formato in ('juntos', 'para_par')),
  modo text not null default 'diario' check (modo in ('diario', 'meta')),
  criado_por uuid not null references auth.users(id) on delete cascade,
  desafiado uuid references auth.users(id) on delete cascade,
  data_inicio date not null,
  data_fim date not null,
  vidas int not null default 3 check (vidas between 1 and 99),
  pontos_dia int not null default 10,
  penalidade_vida int not null default 5,
  aposta text,
  prenda_recusa text,
  status text not null default 'pendente' check (status in ('pendente', 'ativo', 'recusado', 'cancelado')),
  respondido_em timestamptz,
  criado_em timestamptz not null default now()
);

alter table public.desafios enable row level security;
drop policy if exists "casal ve desafios" on public.desafios;
create policy "casal ve desafios" on public.desafios for select to authenticated using (true);
drop policy if exists "criar desafio" on public.desafios;
create policy "criar desafio" on public.desafios for insert to authenticated with check (auth.uid() = criado_por);
drop policy if exists "casal atualiza desafios" on public.desafios;
create policy "casal atualiza desafios" on public.desafios for update to authenticated using (true) with check (true);
drop policy if exists "criador apaga desafio" on public.desafios;
create policy "criador apaga desafio" on public.desafios for delete to authenticated using (auth.uid() = criado_por);

-- ---------- REGRAS DE CADA DESAFIO ----------
create table if not exists public.desafio_regras (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid not null references public.desafios(id) on delete cascade,
  tipo text not null check (tipo in ('sem_acucar', 'agua', 'calorias_max', 'treino', 'passos', 'leitura_paginas', 'biblia', 'personalizada')),
  meta numeric,
  dias_semana int[] not null default '{0,1,2,3,4,5,6}',
  descricao text,
  ordem int not null default 0
);
create index if not exists desafio_regras_desafio_idx on public.desafio_regras (desafio_id, ordem);

alter table public.desafio_regras enable row level security;
drop policy if exists "casal ve regras" on public.desafio_regras;
create policy "casal ve regras" on public.desafio_regras for select to authenticated using (true);
drop policy if exists "casal gerencia regras" on public.desafio_regras;
create policy "casal gerencia regras" on public.desafio_regras for all to authenticated using (true) with check (true);

-- ---------- REGISTRO DIÁRIO DE CADA UM ----------
create table if not exists public.desafio_checkins (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid not null references public.desafios(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data date not null,
  cumpriu boolean not null,
  resultados jsonb not null default '{}',
  observacao text,
  criado_em timestamptz not null default now(),
  unique (desafio_id, user_id, data)
);
create index if not exists desafio_checkins_idx on public.desafio_checkins (desafio_id, user_id, data);

alter table public.desafio_checkins enable row level security;
drop policy if exists "casal ve checkins" on public.desafio_checkins;
create policy "casal ve checkins" on public.desafio_checkins for select to authenticated using (true);
drop policy if exists "cada um registra o seu" on public.desafio_checkins;
create policy "cada um registra o seu" on public.desafio_checkins for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "cada um corrige o seu" on public.desafio_checkins;
create policy "cada um corrige o seu" on public.desafio_checkins for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "cada um apaga o seu" on public.desafio_checkins;
create policy "cada um apaga o seu" on public.desafio_checkins for delete to authenticated using (auth.uid() = user_id);

-- ---------- TEMPO REAL ----------
do $$
declare t text;
begin
  foreach t in array array['desafios', 'desafio_regras', 'desafio_checkins'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

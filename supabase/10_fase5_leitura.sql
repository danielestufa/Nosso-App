-- ---------- LIVROS (catálogo do casal) ----------
create table if not exists public.livros (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  autor text,
  total_paginas int not null check (total_paginas > 0),
  capa text,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

alter table public.livros enable row level security;
drop policy if exists "casal ve livros" on public.livros;
create policy "casal ve livros" on public.livros for select to authenticated using (true);
drop policy if exists "casal cadastra livros" on public.livros;
create policy "casal cadastra livros" on public.livros for insert to authenticated with check (true);
drop policy if exists "casal edita livros" on public.livros;
create policy "casal edita livros" on public.livros for update to authenticated using (true) with check (true);
drop policy if exists "casal apaga livros" on public.livros;
create policy "casal apaga livros" on public.livros for delete to authenticated using (true);

-- ---------- LEITURA DE CADA UM ----------
create table if not exists public.leituras (
  id uuid primary key default gen_random_uuid(),
  livro_id uuid not null references public.livros(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'lendo' check (status in ('quero_ler', 'lendo', 'lido', 'pausado')),
  pagina_inicial int not null default 0,
  iniciado_em date,
  concluido_em date,
  nota int check (nota between 1 and 5),
  criado_em timestamptz not null default now(),
  unique (livro_id, user_id)
);

alter table public.leituras enable row level security;
drop policy if exists "casal ve leituras" on public.leituras;
create policy "casal ve leituras" on public.leituras for select to authenticated using (true);
drop policy if exists "casal cria leituras" on public.leituras;
create policy "casal cria leituras" on public.leituras for insert to authenticated with check (true);
drop policy if exists "cada um edita a sua leitura" on public.leituras;
create policy "cada um edita a sua leitura" on public.leituras for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "cada um apaga a sua leitura" on public.leituras;
create policy "cada um apaga a sua leitura" on public.leituras for delete to authenticated using (auth.uid() = user_id);

-- ---------- PÁGINAS LIDAS POR DIA ----------
create table if not exists public.registros_leitura (
  id uuid primary key default gen_random_uuid(),
  leitura_id uuid not null references public.leituras(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data date not null,
  paginas int not null check (paginas > 0),
  criado_em timestamptz not null default now()
);
create index if not exists registros_leitura_user_data_idx on public.registros_leitura (user_id, data);

alter table public.registros_leitura enable row level security;
drop policy if exists "casal ve registros de leitura" on public.registros_leitura;
create policy "casal ve registros de leitura" on public.registros_leitura for select to authenticated using (true);
drop policy if exists "cada um registra suas paginas" on public.registros_leitura;
create policy "cada um registra suas paginas" on public.registros_leitura for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- META DE PÁGINAS ----------
create table if not exists public.metas_leitura (
  user_id uuid primary key references auth.users(id) on delete cascade,
  paginas_dia int not null default 10,
  livros_ano int,
  atualizado_em timestamptz not null default now()
);

alter table public.metas_leitura enable row level security;
drop policy if exists "ver metas de leitura" on public.metas_leitura;
create policy "ver metas de leitura" on public.metas_leitura for select to authenticated using (true);
drop policy if exists "cada um define sua meta de leitura" on public.metas_leitura;
create policy "cada um define sua meta de leitura" on public.metas_leitura for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- CAPAS (fotos) ----------
insert into storage.buckets (id, name, public)
values ('capas', 'capas', true)
on conflict (id) do nothing;

drop policy if exists "casal envia capas" on storage.objects;
create policy "casal envia capas" on storage.objects for insert to authenticated with check (bucket_id = 'capas');
drop policy if exists "casal troca capas" on storage.objects;
create policy "casal troca capas" on storage.objects for update to authenticated using (bucket_id = 'capas');
drop policy if exists "casal apaga capas" on storage.objects;
create policy "casal apaga capas" on storage.objects for delete to authenticated using (bucket_id = 'capas');

-- ---------- BÍBLIA: PLANOS ----------
create table if not exists public.biblia_planos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plano text not null check (plano in ('evangelhos', 'nt90', 'biblia90', 'anual')),
  inicio date not null,
  ativo boolean not null default true,
  concluido_em date,
  criado_em timestamptz not null default now()
);

alter table public.biblia_planos enable row level security;
drop policy if exists "casal ve planos" on public.biblia_planos;
create policy "casal ve planos" on public.biblia_planos for select to authenticated using (true);
drop policy if exists "cada um gerencia seus planos" on public.biblia_planos;
create policy "cada um gerencia seus planos" on public.biblia_planos for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- BÍBLIA: CAPÍTULOS LIDOS ----------
create table if not exists public.biblia_leituras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plano_id uuid references public.biblia_planos(id) on delete cascade,
  data date not null,
  livro text not null,
  capitulo int not null,
  criado_em timestamptz not null default now()
);
create index if not exists biblia_leituras_user_data_idx on public.biblia_leituras (user_id, data);
create unique index if not exists biblia_leituras_plano_unico on public.biblia_leituras (plano_id, livro, capitulo) where plano_id is not null;

alter table public.biblia_leituras enable row level security;
drop policy if exists "casal ve leituras biblicas" on public.biblia_leituras;
create policy "casal ve leituras biblicas" on public.biblia_leituras for select to authenticated using (true);
drop policy if exists "cada um registra sua leitura biblica" on public.biblia_leituras;
create policy "cada um registra sua leitura biblica" on public.biblia_leituras for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- TEMPO REAL ----------
do $$
declare t text;
begin
  foreach t in array array['livros', 'leituras', 'registros_leitura', 'biblia_planos', 'biblia_leituras'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

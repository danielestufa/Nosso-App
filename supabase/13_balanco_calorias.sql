alter table public.metas_saude add column if not exists gasto_basal int;
alter table public.metas_saude add column if not exists meta_gasto_exercicio int;
alter table public.dia_saude add column if not exists calorias_exercicio int;

drop policy if exists "casal apaga alimentos personalizados" on public.alimentos;
drop policy if exists "casal apaga alimentos" on public.alimentos;
create policy "casal apaga alimentos" on public.alimentos for delete to authenticated using (true);

-- =========================================================
-- NOSSO APP · NOTIFICAÇÃO "COMO FOI O SEU DIA?" ÀS 20H30
-- Rode SOMENTE depois que o site estiver publicado na Vercel.
-- Antes de rodar, troque:
--   SEU-LINK.vercel.app  pelo link do site
--   SEU_CRON_SECRET      pelo mesmo valor colocado na Vercel em CRON_SECRET
-- =========================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove o agendamento antigo, caso exista
do $$
begin
  perform cron.unschedule('como-foi-o-dia');
exception when others then null;
end $$;

-- 23:30 UTC = 20:30 no horário de Brasília
select cron.schedule(
  'como-foi-o-dia',
  '30 23 * * *',
  $$
  select net.http_post(
    url := 'https://SEU-LINK.vercel.app/api/cron-diario',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SEU_CRON_SECRET"}'::jsonb,
    body := '{"tipo": "dia"}'::jsonb
  );
  $$
);
